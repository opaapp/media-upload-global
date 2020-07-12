import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ContentPart {
    payload: Buffer;
    index: Number;
    uploadedOn: Date;
}

export interface IContent extends Document {
    clientID: string;
    createdOn: Date;
    totalParts: Number;
    parts: [ ContentPart ];
}

export interface IContentModel extends Model<IContent> {
}

const _ContentSchema: Schema = new Schema({
    clientID: { type: String, required: true, unique: true },
    createdOn: { type: Date, required: true },
    totalParts: { type: Number, required: true},
    parts: [{
        payload: Buffer,
        index: Number,
        uploadedOn: Date
    }]
})

_ContentSchema.index({ clientID: 1 });

export const Content: IContentModel = mongoose.model<IContent>('Content', _ContentSchema);