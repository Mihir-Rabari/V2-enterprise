import mongoose, { Schema, Document } from 'mongoose';

export interface IFilterSuggestion extends Document {
    fabric: string[];
    patternType: string[];
    collar: string[];
    sleeve: string[];
    neck: string[];
    pocket: string[];
    length: string[];
    chest: string[];
    waist: string[];
    shoulder: string[];
    sleeveLength: string[];
    size: string[];
    color: string[];
    updatedAt: Date;
}

const FilterSuggestionSchema = new Schema<IFilterSuggestion>(
    {
        fabric: [{ type: String }],
        patternType: [{ type: String }],
        collar: [{ type: String }],
        sleeve: [{ type: String }],
        neck: [{ type: String }],
        pocket: [{ type: String }],
        length: [{ type: String }],
        chest: [{ type: String }],
        waist: [{ type: String }],
        shoulder: [{ type: String }],
        sleeveLength: [{ type: String }],
        size: [{ type: String }],
        color: [{ type: String }]
    },
    { timestamps: true }
);

export const FilterSuggestion = mongoose.model<IFilterSuggestion>('FilterSuggestion', FilterSuggestionSchema);
