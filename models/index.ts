import Job, { IJob, FilePayload } from '../schemas/job';
import { Logger } from '@overnightjs/logger';

export class JobModel {
    private _jobModel: IJob;

    constructor(jobModel: IJob) {
        this._jobModel = jobModel;
    }

    get filename(): string {
        return this._jobModel.filename;
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
                    return reject(err.toString());
                }

                console.info(`Job create (id ${obj._id}) of ${obj.filename} successful`);
                return resolve(obj);
            })
        })
    }
}