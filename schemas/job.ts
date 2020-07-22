import mongoose, { Schema, Document, Model } from 'mongoose';

// export interface FilePayload {
//     cloud_url: string;
//     local_abs_path: string;
// }

export interface IJob extends Document {
    contentID: Schema.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    createdOn: Date;
    updateStartTime(): Promise<void>;
}

export interface IJobModel extends Model<IJob> {
    updateStartTime(): Promise<void>;
}

const _JobSchema: Schema = new Schema({
    contentID: { type: Schema.Types.ObjectId, required: true, unique: true },
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
    createdOn: { type: Date, required: true }
})

_JobSchema.methods.updateStartTime = function() {
    // NOTE: only good for return properties defined on objects;
    // not used for saving models
    return;
}

_JobSchema.index({ startTime: 1, createdOn: 1 });
_JobSchema.index({ contentID: 1 });
  
export const Job: IJobModel = mongoose.model<IJob, IJobModel>('Job', _JobSchema);
