import mongoose, { Schema, Document, Model } from 'mongoose';

export interface FilePayload {
    cloud_url: string;
    local_abs_path: string;
}

export interface IJob extends Document {
    filename: string;
    startTime: Date;
    endTime: Date;
    createdOn: Date;
    payload: FilePayload;
    updateStartTime(): Promise<void>;
}

export interface IJobModel extends Model<IJob> {
    updateStartTime(): Promise<void>;
}

const _JobSchema: Schema = new Schema({
    filename: { type: String, required: true, unique: true },
    startTime: { type: Date, required: false },
    endTime: { type: Date, required: false },
    createdOn: { type: Date, required: true },
    payload: { 
        cloud_url: { type: String, required: true },
        local_abs_path: { type: String, required: true }
     },
})

_JobSchema.methods.updateStartTime = function() {
    // NOTE: only good for return properties defined on objects;
    // not used for saving models
    return;
}

_JobSchema.index({ startTime: 1, createdOn: 1 });
  
export const Job: IJobModel = mongoose.model<IJob, IJobModel>('Job', _JobSchema);
