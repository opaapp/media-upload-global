import { Content, ContentPart } from './schemas/content';
import { Schema } from 'mongoose';
import path from 'path';
import fs from 'fs';

export async function recreateMP4(contentID: Schema.Types.ObjectId) : Promise<[string, string, string]> {
    const content = await Content.findById(contentID);
    var contentPartOrdering : { [key:string]:Schema.Types.ObjectId; } = {};
    if (content === null) {
        throw(`Failed to lookup content with id = ${contentID}`);
    } else {
        for (let i=0; i < content.parts.length; i++) {
            const part = content.parts[i];
            contentPartOrdering[String(part.index)] = part.part;
        }

        let outputDir = path.join('/tmp', `${content.videoID}.mp4`);
        let outputFile = fs.createWriteStream(outputDir);
        for (let i=0; i < content.totalParts; i++) {
            const _id = contentPartOrdering[i];
            console.log('here')
            const part = await ContentPart.findById(_id);
            if (part) {
                await (() => {
                    return new Promise<void>((wResolve, wReject) => {
                        outputFile.write(part.payload, (err) => {
                            if (err) {
                                console.error('Error writing file: ', err);
                                return wReject(err);
                            }
                            console.log('successfully wrote to ', outputDir);
                            return wResolve();
                        })
                    })
                })()
            } else {
                throw(`Failed to lookup ContentPart with id = ${_id}, contentID: ${content._id}`);
            }
        }

        outputFile.end();

        return [outputDir, String(content.videoID), content.preview_url];
    }
}