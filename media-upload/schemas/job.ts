import mongoose, { Schema, Document } from 'mongoose';

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

export default mongoose.model<IJob>('Job', _JobSchema);
