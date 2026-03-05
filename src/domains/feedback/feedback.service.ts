import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { generateSerial } from '../../utils/string';
import { parse } from 'csv-parse';
import * as fs from 'fs';

@Injectable()
export class FeedbackService {
    private readonly logger = new Logger(FeedbackService.name);

    constructor(
        @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    ) { }

    /**
     * Inserts an array of feedbacks into the database
     *
     * @param feedbacks Array of Feedback objects
     */
    async insertManyFeedbacks(feedbacks: Feedback[]): Promise<void> {
        try {
            await this.feedbackModel.insertMany(feedbacks);
        } catch (error) {
            throw new Error(`Error inserting feedbacks: ${error.message}`);
        }
    }

    /**
     * Creates a new feedback
     *
     * @param feedbackData The feedback data
     * @returns The created feedback
     */
    async createFeedback(feedbackData: Partial<Feedback>): Promise<Feedback> {
        try {
            const count = await this.feedbackModel.countDocuments();
            const serial = generateSerial(`${count}`);

            const newFeedback = new this.feedbackModel({
                ...feedbackData,
                serial,
                createdAt: new Date(),
            });

            return await newFeedback.save();
        } catch (error) {
            throw new Error(`Error creating feedback: ${error.message}`);
        }
    }

    /**
     * Updates an existing feedback
     *
     * @param id The feedback id
     * @param feedbackData The updated feedback data
     * @returns The updated feedback
     */
    async updateFeedback(id: string, feedbackData: Partial<Feedback>): Promise<Feedback> {
        try {
            return await this.feedbackModel.findByIdAndUpdate(
                id,
                {
                    ...feedbackData,
                    editedAt: new Date(),
                },
                { new: true },
            );
        } catch (error) {
            throw new Error(`Error updating feedback: ${error.message}`);
        }
    }

    /**
     * Finds all feedbacks with pagination
     *
     * @param page Page number
     * @param rows Rows per page
     * @returns Object with feedbacks array and total count
     */
    async findAll(page = 1, rows = 10): Promise<{ feedbacks: Feedback[], length: number }> {
        try {
            const feedbacks = await this.feedbackModel.find({ deleted: { $ne: true } })
                .skip(rows * (page - 1))
                .limit(rows)
                .sort({ serial: -1 })
                .exec();

            const count = await this.feedbackModel.countDocuments({ deleted: { $ne: true } });

            return { feedbacks, length: count };
        } catch (error) {
            this.logger.error(`Error when querying the feedbacks: ${error.message}`);
            throw new Error(`Error when querying the feedbacks: ${error.message}`);
        }
    }

    /**
     * Finds a feedback by id
     *
     * @param id The feedback id
     * @returns The found feedback
     */
    async findById(id: string): Promise<Feedback> {
        try {
            const feedback = await this.feedbackModel.findById(id).exec();
            if (!feedback) {
                throw new Error('Feedback not found');
            }
            return feedback;
        } catch (error) {
            this.logger.error(`Error when querying the feedback: ${error.message}`);
            throw new Error(`Error when querying the feedback: ${error.message}`);
        }
    }

    /**
     * Finds a feedback by description
     *
     * @param description The feedback description
     * @returns The found feedback
     */
    async findByDescription(description: string): Promise<Feedback> {
        try {
            const feedback = await this.feedbackModel.findOne({ description }).exec();
            if (!feedback) {
                throw new Error('Feedback not found');
            }
            return feedback;
        } catch (error) {
            this.logger.error(`Error when querying the feedback: ${error.message}`);
            throw new Error(`Error when querying the feedback: ${error.message}`);
        }
    }

    /**
     * Deletes a feedback (soft delete)
     *
     * @param id The feedback id
     * @param deletedBy The user who deleted the feedback
     * @returns The deleted feedback
     */
    async deleteFeedback(id: string, deletedBy: string): Promise<Feedback> {
        try {
            const feedback = await this.feedbackModel.findByIdAndUpdate(
                id,
                {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy,
                },
                { new: true },
            );

            if (!feedback) {
                throw new Error('Feedback not found');
            }

            this.logger.log(`The soft delete has been completed successfully for feedback ${id}`);
            return feedback;
        } catch (error) {
            this.logger.error(`Error deleting feedback: ${error.message}`);
            throw new Error(`Error deleting feedback: ${error.message}`);
        }
    }

    /**
     * Search feedbacks by various properties
     * 
     * @param searchTerm The search term
     * @param page Page number
     * @param rows Rows per page
     * @returns Object with feedbacks array and total count
     */
    async searchFeedbacks(searchTerm: string, page = 1, rows = 10): Promise<{ data: Feedback[], message: string }> {
        try {
            const searchString = typeof searchTerm === 'string' ? searchTerm : '';
            let query = {};

            if (searchString !== 'all') {
                const regex = new RegExp(searchString, 'i');
                query = {
                    $or: [
                        { serial: { $regex: regex } },
                        { title: { $regex: regex } },
                        { description: { $regex: regex } },
                        { createdBy: { $regex: regex } },
                        { editedBy: { $regex: regex } },
                    ],
                };
            }

            const objects = await this.feedbackModel.find(query)
                .skip(rows * (page - 1))
                .limit(rows)
                .sort({ serial: -1 })
                .exec();

            return { message: 'Search results', data: objects };
        } catch (error) {
            this.logger.error(`An error occurred during the search: ${error.message}`);
            throw new Error(`An error occurred during the search: ${error.message}`);
        }
    }

    /**
     * Process CSV file and insert many feedbacks
     * 
     * @param filePath Path to the CSV file
     * @returns Message indicating success
     */
    async processCsvAndInsertFeedbacks(filePath: string): Promise<{ message: string }> {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const feedbacksData = await new Promise<any[]>((resolve, reject) => {
                parse(fileContent, { columns: true }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            const feedbacks: Partial<Feedback>[] = [];

            for (const row of feedbacksData) {
                const feedback: Partial<Feedback> = {
                    serial: row['serial'],
                    title: row['title'],
                    description: row['description'],
                    isFeature: false,
                    isSupport: false,
                    isActive: false,
                    createdAt: new Date(),
                    createdBy: row['createdBy'],
                };
                feedbacks.push(feedback);
            }

            await this.insertManyFeedbacks(feedbacks as Feedback[]);
            return { message: 'Feedbacks inserted successfully' };
        } catch (error) {
            this.logger.error(`Error inserting feedbacks: ${error.message}`);
            throw new Error(`Failed to insert feedbacks: ${error.message}`);
        } finally {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                this.logger.error(`Error deleting file: ${error.message}`);
            }
        }
    }

    /**
     * Hard deletes a feedback by its ID
     *
     * @param id The feedback id
     * @returns The deleted feedback
     */
    async hardDeleteFeedback(id: string): Promise<Feedback> {
        try {
            const feedback = await this.feedbackModel.findByIdAndDelete(id);

            if (!feedback) {
                throw new Error('Feedback not found');
            }

            this.logger.log(`The feedback has been removed successfully: ${id}`);
            return feedback;
        } catch (error) {
            this.logger.error(`Error delete feedback: ${error.message}`);
            throw new Error(`Error delete feedback: ${error.message}`);
        }
    }

    /**
     * Updates the status of a feedback
     *
     * @param id The feedback id
     * @param isActive The new active status
     * @param editedBy The user who edited the feedback
     * @returns The updated feedback
     */
    async updateStatusFeedback(id: string, isActive: boolean, editedBy: string): Promise<Feedback> {
        try {
            const feedback = await this.feedbackModel.findByIdAndUpdate(
                id,
                {
                    isActive,
                    editedBy,
                    editedAt: new Date(),
                },
                { new: true },
            );

            if (!feedback) {
                throw new Error('Feedback not found');
            }

            this.logger.log(`The update has been completed successfully for feedback ${id}`);
            return feedback;
        } catch (error) {
            this.logger.error(`Error updating feedback status: ${error.message}`);
            throw new Error(`Error updating feedback status: ${error.message}`);
        }
    }
}