import mongoose, { mongo, Schema } from 'mongoose';
import { Job, IJob } from '../schemas/job';
import { Content, IContent, ContentPart, IContentPart, IContentPartModel } from '../schemas/content';
import { Logger } from '@overnightjs/logger';
import { DateTime } from 'luxon';
const crypto = require('crypto');
import fs from 'fs';
import { resolve } from 'path';
import { recreateMP4 } from '../util';
import { ObjectID } from 'bson';

const ObjectId = mongoose.Types.ObjectId;

const JOB_COMPLETION_INTERVAL_IN_SECONDS: number = Number(process.env['JOB_COMPLETION_INTERVAL_IN_SECONDS']) || 80;

export interface Rendition {
    resolution: string;
    bitrate: string;
    audioRate: string;
    crf: string;
}

function sendError(msg: string) {
    console.log(msg);
}

export class ContentModel {
    private _contentModel: IContent;

    constructor(contentModel: IContent) {
        this._contentModel = contentModel;
    }

    static cleanUp(content: IContent) {
        return new Promise<void>(async (res, rej) => {
            // clean up content parts
            // const session = await mongoose.startSession();
            // session.startTransaction();
            console.log('HERE')
            try {
                for (let i=0; i<content.parts.length; i++) {
                    await ContentPart.findByIdAndDelete(content.parts[i].part);
                }
                console.log('A')
                content.parts = [];
                await content.save();
                // await Content.findOneAndDelete({ _id: content._id });
                console.log('Bae')///
                // await session.commitTransaction();
                // session.endSession();
                return res();
            } catch (error) {

                // If an error occurred, abort the whole transaction and
                // undo any changes that might have happened
                // await session.abortTransaction();
                // session.endSession();
                return rej(error); 
            }
        })
    }

    static validateMP4(content: IContent, source_path: string) : boolean {
        // todo: need to put a physical limit on file sizes in case not enough
        // resources
        const payload = fs.readFileSync(source_path);
        const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
        
        if (calculatedHash != content.mediaHash) {
            console.log(`calculatedHash(${calculatedHash}) != content.mediaHash(${content.mediaHash})`);
        }
    
        return calculatedHash == content.mediaHash;
    }

    static isVariantsUploaded(content: IContent|null): boolean {
        if (content == null) {
            return false;
        }
        console.log('debug: checking if variants all uploaded')//
        for (const rendition of JobModel.renditions) {
            let isFound = false;
            
            for (const variant of content.variants) {
                if (variant.resolution == rendition.resolution) {
                    isFound = true;
                    break;
                }
            }
            
            if (isFound) {
                continue;
            } else {
                return false;
            }
        }

        return true;
    }

    static addThumbnail(clientID: string, preview_url: string) : Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const content = await Content.findOneAndUpdate({
                    clientID
                }, {
                    $set: { preview_url }
                }, { new: true })
                console.log('setting ', clientID, ' for ', preview_url);
                console.log('nC: ', content);

                if (content) {
                    return resolve();
                } else {
                    return reject(new Error(`Failed to lookup content with clientID, ${clientID}`));
                }
            } catch (error) {
                console.error(error);
                return reject(error);
            }
        })
    }

    static markVariantDone(contentID: Schema.Types.ObjectId, resolution: string) : Promise<IContent|null> {
        console.log('marking res: ', resolution);
        return new Promise(async (resolve, reject) => {
            const content = Content.findOneAndUpdate({ _id: String(contentID) }, {
                $push: { variants: {
                    resolution,
                    status: "done"
                }}
            }, { new: true });
          
            if (content == null) {
                return reject(new Error(`content was null, id=${contentID}`));
            }

            return resolve(content);
        })
    }

    static partExists(clientID: string, index: number) : Promise<boolean> {
        return new Promise(async (resolve, _) => {
            const content = await Content.findOne({ clientID });
            if (content) {
                for (let i=0; i<content.parts.length; i++) {
                    if (content.parts[i].index == index) {
                        return resolve(true);
                    }
                }
            }

            return resolve(false);
        })
    }

    static addPart(clientID: string, payload: Buffer, index: number) : Promise<number> {
        return new Promise(async (resolve, reject) => {
            const contentPart: IContentPart = new ContentPart({ payload });
            
            await contentPart.save();

            const content = await Content.findOneAndUpdate({
                clientID
            }, {
                $push: { parts: {
                    part: contentPart,
                    index,
                    uploadedOn: new Date()
            }}}, { new: true })

            console.log('nC: ', content);

            if (content) {
                const partsReceived = content.parts?.length;
                const partsRemaining = Number(content.totalParts) - partsReceived;
                return resolve(partsRemaining);
            } else {
                return reject(new Error(`Failed to lookup content with clientID, ${clientID}`));
            }
        })
    }

    static createNew(videoID: string, clientID: string, totalParts: number, mediaHash: string) {
        return new Promise((resolve, reject) => {
            const content: IContent = new Content({
                videoID,
                clientID,
                mediaHash,
                totalParts,
                createdOn: new Date()
            });

            content.save((err, _obj) => {
                if (err) {
                    if (err.toString().match('E11000 duplicate key error') !== null) {
                      return resolve(null);
                    }

                    Logger.Err(err.toString());
                    return reject(err);
                }

                return resolve(null);
            })
        })
    }
}

export class JobModel {
    private _jobModel: IJob;
    static renditions: Array<Rendition> = [
        {
            resolution: "540x960",
            bitrate: "2000k",
            audioRate: "128k",
            crf: "29"
        },
        {
            resolution: "360x640",
            bitrate: "600k",
            audioRate: "96k",
            crf: "34"
        },
        {
            resolution: "240x430",
            bitrate: "360k",
            audioRate: "96k",
            crf: "39"
        },
        {
            resolution: "720x1280",
            bitrate: "4500k",
            audioRate: "128k",
            crf: "25"
        },
        {
            resolution: "1080x1920",
            bitrate: "6000k",
            audioRate: "192k",
            crf: "NaN"  // NaN will upload the original. WARNING: this also needs to be in place to upload original mp4 to cloud
        },
    ];

    constructor(jobModel: IJob) {
        this._jobModel = jobModel;
    }

    static validateContent(content: IContent) : boolean {
        const len = content.totalParts;
        const allParts: Array<number> = new Array(len);
        for (const part of content.parts) {
            if (part.index < len) {
                allParts[part.index] = 1;
            }
        }

        for (let i=0; i<allParts.length; i++) {
            if (allParts[i] !== 1) {
                console.error(`ERROR: missing part ${i} for content, id=${content._id}`);
                return false;
            }
        }

        return true;
    }

    static recreateAndValidateMP4(content: IContent) : Promise<boolean> {
        // 1. recreate mp4
        // 2. validate mp4
        // if valid, then 
          // a. delete contentparts
          // b. return true

        // if not valid, then
          // a. delete contentpart + reference to content part in single transaction
          // b. send recreate sync api call
          // c. return false

        return new Promise(async (resolve,reject) => {
            try {
                const [source_path,] = await recreateMP4(content._id);

                // TODO: change back to const
                let isValid = ContentModel.validateMP4(content, source_path);
                console.log(`TEST: isValid=${isValid} .. changing to false`)
                isValid = false;
                if (!isValid) {
                    const err_msg = `media hash validation failed, job contentID=${content._id}`;
                    sendError(err_msg);
                    
                    // sendClientReencode(content.clientID, String(content.userID));
                    // return reject(err_msg);
                    return resolve(false);
                }

                return resolve(true);
            } catch (err) {
                return reject(err)
            }
        })
    }

    static fetchContent() : Promise<void> {
        return new Promise((resolve, reject) => {
            Content.find({ jobCreatedOn: undefined }, (err, contents) => {
                if (err) {
                    return reject(err);
                }

                contents.map(async content => {
                    if (content.parts.length >= content.totalParts && 
                            content.preview_url && 
                            this.validateContent(content))
                        {
                            try {
                                const isMP4Valid = await this.recreateAndValidateMP4(content);
                                if (isMP4Valid) {
                                    console.log('creating job for ', content.videoID);
                                    await this.createJob(content);
                                }
                            } catch (err) {
                                console.log('TEST HERE')
                                ContentModel.cleanUp(content);
                                console.log('Validation error: ', err)
                            }
                        }
                })
            }).sort({ createdOn: -1 })

            return resolve();
        })
    }

    static removeJob(job: IJob) : Promise<boolean> {
        return new Promise((resolve, reject) => {
            Job.findByIdAndRemove(job._id, (err, res) => {
                if (err) {
                    return reject(err);
                }

                console.log('deleted: ', res);
                return resolve(true);
            })
        })
    }

    static fetchIncompleteJob() : Promise<IJob|null> {
        return new Promise((resolve, reject) => {
            const allowed_completion_time = DateTime.utc().minus({ seconds: 10 }).toJSDate();
            Job.findOneAndUpdate({
                startTime: { $lte: allowed_completion_time }
            }, {
                $set: { startTime: new Date() }
            }, (err, job) => {
                if (err) {
                    console.error(err.toString());
                    return reject(err);
                }

                if (job) {
                    console.warn('Found incomplete job. Start processing ...')
                }

                return resolve(job);
            }).sort({ createdOn: 1 })
        })
    }

    static fetchNextJob() : Promise<IJob|null> {
        return new Promise((resolve, reject) => {
            Job.findOneAndUpdate({
                startTime: undefined
            }, {
                $set: { startTime: new Date() }
            }, { new: true }, (err, job, ) => {
                if (err) {
                    console.error(err.toString());
                    return reject(err);
                }

                return resolve(job);
            }).sort({ createdOn: 1 })
        })
    }

    static createJob(content: IContent) : Promise<void> {
        const contentID : String = String(content._id);
        console.info(`Job create of contentID, ${contentID}, started`);
        return new Promise(async (resolve, _reject) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                for (const rendition of this.renditions) {
                    // Create a job to encode rendition/
                    const jobType = `encode-${rendition.resolution}`;
                    let obj = await Job.findOneAndUpdate({
                        contentID: content._id, 
                        jobType
                    }, {
                        createdOn: new Date(),
                        jobKwargs: JSON.stringify(rendition)
                    }, { upsert: true });

                    // const job: IJob = new Job({
                    //     contentID,
                    //     ,
                    //     jobType: ,
                        
                    // });
        
                    // let obj = await job.save()
                    console.log('obj: ', obj);

                    content.jobCreatedOn = new Date();
                    console.log('A')
                    await content.save();
                    console.log('B')
                    console.info('Content updated to reflect job');
                    console.info(`Job create (id ${obj?._id}) successful, rendition=${rendition.resolution}`);
                }

                await session.commitTransaction();
                session.endSession();
                return resolve();
            } catch (error) {

                // If an error occurred, abort the whole transaction and
                // undo any changes that might have happened
                await session.abortTransaction();
                session.endSession();
                // throw error; 
            }
        })
    }
}