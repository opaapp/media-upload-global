import mongoose, { mongo } from 'mongoose';
import { Job, IJob   } from '../schemas/job';
import { Content, IContent, ContentPart, IContentPart, IContentPartModel } from '../schemas/content';
import { Logger } from '@overnightjs/logger';
import { DateTime } from 'luxon';
import { resolve } from 'path';

const JOB_COMPLETION_INTERVAL_IN_SECONDS: number = Number(process.env['JOB_COMPLETION_INTERVAL_IN_SECONDS']) || 80;

export class ContentModel {
    private _contentModel: IContent;

    constructor(contentModel: IContent) {
        this._contentModel = contentModel;
    }

    static addPart(clientID: string, payload: Buffer, index: number) {
        return new Promise(async (resolve, reject) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const contentPart: IContentPart = new ContentPart({ payload });
                
                await contentPart.save();

                const content = await Content.findOneAndUpdate({
                    clientID
                }, {
                    $push: { parts: {
                        part: contentPart,
                        index,
                        uploadedOn: new Date()
                }}}, { new: true }).session(session)

                console.log('nC: ', content);

                if (content) {
                    const partsReceived = content.parts?.length;
                    if (partsReceived > 0) {
                        const partsRemaining = Number(content.totalParts) - partsReceived;
                        await session.commitTransaction();
                        return resolve(partsRemaining);
                    }
                } else {
                    return reject(new Error(`Failed to lookup content with clientID, ${clientID}`));
                }
            } catch (error) {
                await session.abortTransaction();
                console.error(error);
                throw error;
            } finally {
                session.endSession();
            }
            
        })
    }

    static createNew(videoID: string, clientID: string, totalParts: number) {
        return new Promise((resolve, reject) => {
            const content: IContent = new Content({
                videoID,
                clientID,
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

    constructor(jobModel: IJob) {
        this._jobModel = jobModel;
    }

    static fetchContent() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            console.log('fetching content ... ')
            Content.find({ jobCreatedOn: { $eq: undefined }}, (err, content) => {
                if (err) {
                    return reject(err);
                }

                content.forEach(c => {
                    if (c.parts.length === c.totalParts) {
                        const videoID = String(c.videoID);
                        console.log('creating job for ', videoID);
                        this.createJob(videoID);
                    }
                    for (const part of c.parts) {
                        console.log('PART - ', part.index);
                    }
                })
            })

            return resolve(false);
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
            const allowed_completion_time = DateTime.utc().minus({ seconds: JOB_COMPLETION_INTERVAL_IN_SECONDS }).toJSDate();
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

    static createJob(contentID: string) : Promise<IJob> {
        console.info(`Job create of contentID, ${contentID}, started`);
        return new Promise(async (resolve, _reject) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                // Create a new job
                    const job: IJob = new Job({
                        contentID,
                        createdOn: new Date(),
                    });
        
                    let obj = await job.save()
                    
                    console.info(`Job create (id ${obj._id}) successful`);
                  
                // Update the content object to reflect the job created against it
                    await Content.findByIdAndUpdate(contentID, {
                        $set: { jobCreatedOn: new Date() }
                    }).session(session)

                    console.info('Content updated to reflect job');

                await session.commitTransaction();
                session.endSession();
                return resolve(job);
            } catch (error) {

                // If an error occurred, abort the whole transaction and
                // undo any changes that might have happened
                await session.abortTransaction();
                session.endSession();
                throw error; 
            }
        })
    }
}