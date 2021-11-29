import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentPart extends Document {
    payload: Buffer;
}

export interface IContent extends Document {
    videoID: Schema.Types.ObjectId;
    clientID: string;
    userID: mongoose.Types.ObjectId;
    mediaHash: string;
    createdOn: Date;
    updatedOn: Date;
    mp4ValidationFailureCount: number;
    jobCreatedOn: Date;
    totalParts: number;
    preview_url: string;
    parts: {
        part: Schema.Types.ObjectId,
        index: number,
        uploadedOn: Date
    }[];
    variants: [{
        resolution: string;
        status: string;
        uploadedOn: Date;
    }]
}

export interface IContentModel extends Model<IContent> {}

const _ContentSchema: Schema = new Schema({
    videoID: { type: Schema.Types.ObjectId, required: true, unique: true },
    clientID: { type: String, required: true, unique: true },
    userID: { type: Schema.Types.ObjectId, required: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: false },
    mp4ValidationFailureCount: { type: Number, required: false, default: 0 },
    jobCreatedOn: { type: Date, required: false, default: undefined },
    totalParts: { type: Number, required: true},
    preview_url: { type: String, required: false },
    mediaHash: { type: String, required: true },
    variants: [{
        resolution: { type: String, required: true },
        status: { type: String, required: true },
        uploadedOn: { type: Date, required: true }
    }],
    parts: [{
        part: { type: Schema.Types.ObjectId, ref: 'contentparts'},
        index: { type: Number, required: true },
        uploadedOn: { type: Date, required: true } 
    }]
})

_ContentSchema.index({ videoID: 1 });
_ContentSchema.index({ clientID: 1 });

const _ContentPartSchema: Schema = new Schema({
    payload: { type: Buffer, required: true }
})

export interface IContentPartModel extends Model<IContentPart> {}

export const Content: IContentModel = mongoose.model<IContent>('Content', _ContentSchema);
export const ContentPart: IContentPartModel = mongoose.model<IContentPart>('ContentPart', _ContentPartSchema);
