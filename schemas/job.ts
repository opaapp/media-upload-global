import mongoose, { Schema, Document, Model } from 'mongoose';

// export interface FilePayload {
//     cloud_url: string;
//     local_abs_path: string;
// }

export interface IJob extends Document {///
    contentID: Schema.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    createdOn: Date;
    jobType: String;
    jobKwargs: String;
    updateStartTime(): Promise<void>;
}

export interface IJobModel extends Model<IJob> {
    updateStartTime(): Promise<void>;
}

const _JobSchema: Schema = new Schema({
    contentID: { type: Schema.Types.ObjectId, required: true },
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
    createdOn: { type: Date, required: true },
    jobType: String,
    jobKwargs: String,
})

_JobSchema.methods.updateStartTime = function() {
    // NOTE: only good for return properties defined on objects;
    // not used for saving models
    return;
}

_JobSchema.index({ startTime: 1, createdOn: 1 });
_JobSchema.index({ contentID: 1, jobType: 1 }, { unique: true });
  
export const Job: IJobModel = mongoose.model<IJob, IJobModel>('Job', _JobSchema);
