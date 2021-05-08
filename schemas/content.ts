import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentPart extends Document {
    payload: Buffer;
}

export interface IContent extends Document {
    videoID: Schema.Types.ObjectId;
    clientID: string;
    createdOn: Date;
    jobCreatedOn: Date;
    totalParts: number;
    preview_url: string;
    parts: [{
        part: Schema.Types.ObjectId,
        index: number,
        uploadedOn: Date
    }];
}

export interface IContentModel extends Model<IContent> {}

const _ContentSchema: Schema = new Schema({
    videoID: { type: Schema.Types.ObjectId, required: true, unique: true },
    clientID: { type: String, required: true, unique: true },
    createdOn: { type: Date, required: true },
    jobCreatedOn: { type: Date, required: false, default: undefined },
    totalParts: { type: Number, required: true},
    preview_url: { type: String, required: false },
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
