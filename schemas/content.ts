import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentPart extends Document {
    payload: Buffer;
}

export interface IContent extends Document {
    videoID: Schema.Types.ObjectId;
    clientID: string;
    createdOn: Date;
    totalParts: Number;
    parts: [{
        payload: Schema.Types.ObjectId,
        index: Number,
        uploadedOn: Date
    }];
}

export interface IContentModel extends Model<IContent> {}

const _ContentSchema: Schema = new Schema({
    videoID: { type: Schema.Types.ObjectId, required: true, unique: true },
    clientID: { type: String, required: true, unique: true },
    createdOn: { type: Date, required: true },
    totalParts: { type: Number, required: true},
    parts: [{
        payload: { type: Schema.Types.ObjectId, ref: 'contents'},
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
