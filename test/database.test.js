const assert = require('assert');
const db = require('../database.js');


describe('database.js tests', () => {
    it ('should with foreign_keys: 1', async () => {
        assert.equal(await db.showRows('pragma foreign_keys;'), '{"foreign_keys":1}');
    });
    
    before((done) => {
        db.sendQuery('BEGIN TRANSACTION;');
        done();
    });
    
    after((done) => {
        db.sendQuery('ROLLBACK;');
        done();
    });
    
    
    describe('db.insertNewChannel()', () => {
        it ('should resolve 1 and exist on correct params', async () => {
            assert.equal(await db.insertNewChannel('123', 'testname'), 1);
            assert.equal(await db.showRows('select * from channel where channel_id = 123;'), 
            '{"channel_id":123,"channel_name":"testname","prefix":"!","mods_can_edit":1,"while_live":1}');
        });
        it ('should resolve an error message on unique constraint failure', async () => {
            assert.notEqual(await db.insertNewChannel('123', 'testname'), 1);
        });
        it ('should resolve an error message on incorrect id', async () => {
            assert.notEqual(await db.insertNewChannel('abc', 'testname'), 1);
        });
        it ('should resolve an error message on null params', async () => {
            assert.notEqual(await db.insertNewChannel('1234'), 1);
        });
    });
    
    
    describe('db.insertNewCommand()', () => {
        it ('should resolve 1 and exist on correct params', async () => {
            assert.equal(await db.insertNewCommand('cmdName', 5, 1, 20, 0), 1);
            assert.equal(await db.showRows('select * from command where command_name = "cmdName";'),
            '{"command_name":"cmdName","cooldown":5,"min_cooldown":1,"dev_only":0,"max_cooldown":20}');
        });
        it ('should resolve an error message on unique constraint failure', async () => {
            assert.notEqual(await db.insertNewCommand('cmdName', 5, 1, 20, 0), 1);
        });
        it ('should resolve an error message on null params', async () => {
            assert.notEqual(await db.insertNewCommand(), 1);
            assert.notEqual(await db.insertNewCommand('cmdName'), 1);
            assert.notEqual(await db.insertNewCommand('cmdName', 5, 1), 1);
        });
    });
    
    
    describe('db.setChannelValue()', () => {
        it ('should resolve 1 and exist on correct params', async () => {
            assert.equal(await db.insertNewChannel('124', 'testname2'), 1);
            assert.equal(await db.setChannelValue('124', 'prefix', 'coolprefix'), 1);
            assert.equal(await db.showRows('select * from channel where channel_id = 124;'), 
            '{"channel_id":124,"channel_name":"testname2","prefix":"coolprefix","mods_can_edit":1,"while_live":1}');
        });
        it ('should resolve -1 on null params', async () => {
            assert.equal(await db.setChannelValue('124', 'prefix'), -1);
        });
        it ('should resolve -1 message on unknown column', async () => {
            assert.equal(await db.setChannelValue('124'), -1);
            assert.equal(await db.setChannelValue('124', 'unknown'), -1);
        });
    });
    
    
    describe('db.insertIntoChannelCommand()', () => {
        it ('should resolve 1 and exist on correct params', async () => {
            let commandsStr = await db.showRows('select count(*) from command;')
            assert.equal(await db.insertIntoChannelCommand('channel', '148973258'), 1);
            assert.deepEqual(await db.showRows('select count(*) from channel_command where channel_id = "148973258";'), commandsStr);
        });
        it ('should resolve -1 on unknown cause', async () => {
            assert.equal(await db.insertIntoChannelCommand('unknown', '148973258'), -1);
        });
    });
    
    
    describe('db.setChannelCommandValue()', () => {
        it ('should resolve 1 and exist on correct params', async () => {
            assert.equal(await db.insertNewChannel('125', 'testname3'), 1);
            assert.equal(await db.insertIntoChannelCommand('channel', '125'), 1);
            assert.equal(await db.setChannelCommandValue('125', 'ra', 'enabled', 0), 1);
            assert.equal(await db.setChannelCommandValue('125', 'ra', 'cooldown', 9), 1);
            assert.equal(await db.showRows('select * from channel_command where channel_id = 125 and command_name = "ra";'), 
            '{"cooldown":9,"enabled":0,"channel_id":125,"command_name":"ra"}');
        });
        it ('should resolve -1 on null value', async () => {
            assert.equal(await db.setChannelCommandValue('125', 'ra', 'enabled'), -1);
        });
        it ('should resolve -1 on unknown option', async () => {
            assert.equal(await db.setChannelCommandValue('125', 'ra', 'unknown', 0), -1);
            assert.equal(await db.setChannelCommandValue('125', 'ra'), -1);
        });
    });
});