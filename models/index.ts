import { Job, IJob, FilePayload } from '../schemas/job';
import { Content, IContent } from '../schemas/content';
import { Logger } from '@overnightjs/logger';
import { DateTime } from 'luxon';

const JOB_COMPLETION_INTERVAL_IN_SECONDS: number = Number(process.env['JOB_COMPLETION_INTERVAL_IN_SECONDS']) || 80;

export class ContentModel {
    private _contentModel: IContent;

    constructor(contentModel: IContent) {
        this._contentModel = contentModel;
    }

    static addPart(clientID: string, payload: Buffer, index: Number) {
        return new Promise((resolve, reject) => {
            Content.findOneAndUpdate({
                clientID
            }, {
                $push: { parts: {
                    payload,
                    index,
                    uploadedOn: new Date()
                }}
            }, (err, content) => {
                if (err) {
                    console.error(err.toString());
                    return reject(err);
                }

                return resolve(content);
            })
        })
    }

    static createNew(clientID: string, totalParts: number) {
        return new Promise((resolve, reject) => {
            const content: IContent = new Content({
                clientID,
                totalParts,
                createdOn: new Date()
            });

            content.save((err, obj) => {
                if (err) {
                    Logger.Err(err.toString());
                    return reject(err);
                }

                return resolve(obj);
            })
        })
    }
}

export class JobModel {
    private _jobModel: IJob;

    constructor(jobModel: IJob) {
        this._jobModel = jobModel;
    }

    get filename(): string {
        return this._jobModel.filename;
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

    static createJob(filename: string, payload: FilePayload) : Promise<IJob> {
        console.info(`Job create of ${filename} started`);
        return new Promise((resolve, reject) => {
            const job: IJob = new Job({
                filename,
                payload,
                createdOn: new Date(),
            });

            job.save((err, obj) => {
                if (err) {
                    Logger.Err(err.toString());
                    return reject(err);
                }

                console.info(`Job create (id ${obj._id}) of ${obj.filename} successful`);
                return resolve(obj);
            })
        })
    }
}