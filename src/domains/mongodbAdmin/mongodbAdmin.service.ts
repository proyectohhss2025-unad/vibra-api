import { Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { MongoDBAdmin } from './schemas/mongodbAdmin.schema';
import mongoose from 'mongoose';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class MongoDBAdminService {
    constructor(
        @InjectModel(MongoDBAdmin.name) private readonly mongoDBAdminModel: Model<MongoDBAdmin>,
    ) { }

    async cloneDatabase(originDatabaseName: string, destinationDatabaseName: string): Promise<void> {
        try {
            mongoose.disconnect();
            const originConnection = await mongoose.connect(`mongodb://localhost:27017/${originDatabaseName}`);

            const backupFileName = `${originDatabaseName}.bson`;
            const backupCommand = `mongodump --db ${originDatabaseName} --out ./`;
            await this.executeCommand(backupCommand);

            const sourceFile = createReadStream(backupFileName);
            const destinationFile = createWriteStream(backupFileName);
            await pipelineAsync(sourceFile, destinationFile);

            const destinationConnection = await mongoose.connect(`mongodb://localhost:27017/${destinationDatabaseName}`);
            const restoreCommand = `mongorestore --db ${destinationDatabaseName} --drop ./`;
            await this.executeCommand(restoreCommand);

            await originConnection.disconnect();
            await destinationConnection.disconnect();

            return Promise.resolve();
        } catch (error) {
            throw error;
        }
    }

    async getDatabases(): Promise<any> {
        try {
            await mongoose.connect('mongodb://localhost:27017/mia_wallet');
            const dbNames = await mongoose?.connection?.db?.admin().listDatabases();

            const databases = dbNames?.databases.map(db => ({
                name: db.name,
                collections: [],
            }));

            for (const database of databases) {
                database.collections = await mongoose?.connection?.db?.listCollections().toArray().then(collections =>
                    collections.map(collection => collection.name)
                ) ?? [];
            }

            await mongoose.disconnect();
            return databases;
        } catch (error) {
            throw error;
        }
    }

    private async executeCommand(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const exec = require('child_process').exec;
            exec(command, (error: any, stdout: any, stderr: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}