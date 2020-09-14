const assert = require('assert');
const rewire = require('rewire');
const db = require('../database.js');


var botardo = rewire('../botardo.js');
channelsObjs = botardo.__get__('channelsObjs');
commandObjs = botardo.__get__('commandObjs');

describe('botardo.js tests', () => {
    describe('loading channel data', () => {
        it ('both channels are in channelsObjs after loading from db', () => {
            assert.equal(Object.keys(channelsObjs).length, 2);
            assert.deepEqual(Object.keys(channelsObjs), ['#duardo1', '#fabzeef']);
        });
        it ('the channel object got created correctly', () => {
            let obj = channelsObjs['#duardo1'];
            assert.equal(typeof obj, 'object');
            assert.equal(obj.id, '84800191');
            assert.equal(obj.name, '#duardo1');
            assert.equal(obj.prefix, '!');
            assert.equal(obj.modsCanEdit, true);
            assert.equal(obj.whileLive, true);
            assert.equal(obj.gameRunning, false);
        });
        describe ('botardo.loadChannel()', () => {
            loadChannel = botardo.__get__('loadChannel');
            it ('should return -1 with empty params', () => {
                assert.equal(loadChannel(), -1);
            });
            it ('should return -1 if id isnt a number', () => {
                assert.equal(loadChannel('abc', 'duardo1', '!', true, true), -1);
            });
            it ('should return 1 if bools are invalid or missing', () => {
                assert.equal(loadChannel(123, 'abc', '!'), 1);
                assert.equal(loadChannel(123, 'abc2', '!', 5, 5), 1);
                assert.equal(channelsObjs.hasOwnProperty('#abc'), true);
                delete channelsObjs['#abc'];
                delete channelsObjs['#abc2'];
            });
            it ('shoudl return 1 if prefix is undefined', () => {
                assert.equal(loadChannel(123, 'abc3'), 1);
                assert.equal(channelsObjs.hasOwnProperty('#abc3'), true);
                delete channelsObjs['#abc3'];
            });
        });
    });
    
    
    describe('loading command data', () => {
        it ('commands are in the commandsObjs after loading from db', () => {
            assert.equal(Object.keys(commandObjs).length, 6);
            assert.equal(Object.keys(commandObjs).includes('ping'), true);
            assert.equal(Object.keys(commandObjs).includes('addCommand'), true);
        });
        it ('the command object got created correctly', () => {
            let cmdObj = commandObjs['ping'];
            assert.equal(typeof cmdObj, 'object');
            assert.equal(cmdObj.name, 'ping');
            assert.equal(cmdObj.cooldown, 3);
            assert.equal(cmdObj.minCooldown, 1);
            assert.equal(cmdObj.maxCooldown, 600000);
            assert.equal(cmdObj.devOnly, false);
            assert.equal(cmdObj.changeable, false);
        });
        describe('botardo.loadCommand()', () => {
            loadCommand = botardo.__get__('loadCommand');
            it ('should return -1 if five params are missing', () => {
                assert.equal(loadCommand(), -1);
            });
            it ('should return -1 if cooldown, minCooldown arent numbers', () => {
                assert.equal(loadCommand('abc', 'a', 'b', true), -1);
                assert.equal(loadCommand('abc', 3, 'b', true), -1);
            });
            it ('should return 1 with wrong maxCooldown', () => {
                assert.equal(loadCommand('abc', 3, 1, true, 'c'), 1);
                assert.equal(loadCommand('abc2', 3, 1, true), 1);
                assert.equal(commandObjs.hasOwnProperty('abc'), true);
                assert.equal(commandObjs.hasOwnProperty('abc2'), true);
                delete commandObjs['abc'];
                delete commandObjs['abc2'];
            });
        });
    });
    
    
    describe('command object functions', () => {
       describe('botardo.command.getChannelCooldown()', () => {
           it ('should resolve with default cooldown on invalid channelID', async () => {
               assert.equal(await commandObjs['ping'].getChannelCooldown('abc'), 3);
           });
           it ('should resolve with channel cooldown on correct channelID', async () => {
               assert.equal(await commandObjs['ping'].getChannelCooldown('84800191'), 2);
           });
       });
       describe('botardo.getEnabledStatus()', () => {
           it ('should resolve false on invalid channelID', async() => {
               assert.equal(await commandObjs['ping'].getEnabledStatus('abc'), false);
           });
           it ('should resolve true on valid channelID', async() => {
               assert.equal(await commandObjs['ping'].getEnabledStatus('84800191'), true);
           });
       });
    });
    
    
    describe('botardo.allowanceCheck()', () => {
        allowanceCheck = botardo.__get__('allowanceCheck');
        it ('should return -1 if channelObj or the commandObj are undefined', async () => {
            assert.equal(await allowanceCheck('#duardo1', {'user-id': '123'}, 'unknown', function(){}, []), -1);
            assert.equal(await allowanceCheck('#unknown', {'user-id': '123'}, 'unknown', function(){}, []), -1);
        });
        describe('dev only tests', () => {
            it ('should return -1 if a devonly command is used by a normal user', async () => {
                assert.equal(await allowanceCheck('#duardo1', {'user-id': '123'}, 'eval', function(){}, []), -1);
            });
            it ('should return 1 if a devonly command is used by the dev', async () => {
                assert.equal(await allowanceCheck('#duardo1', {'user-id': '84800191'}, 'eval', function(){}, []), 1);
            });
        });
        it ('should return -1 if the command is disabled', async () => {
            assert.equal(await allowanceCheck('#duardo1', {'user-id': '123'}, 'ush', function(){}, []), -1);
        });
    });
    
    
    describe('botardo.addChannel()', () => {
        addChannel = botardo.__get__('addChannel');
        it ('should return -1 on empty or wrong parameters', async () => {
            assert.equal(await addChannel(), -1);
            assert.equal(await addChannel('#duardo1', 'abc', 'testchannel'), -1);
            
        });
        it ('should return -1 on duplicate channel', async () => {
            assert.equal(await addChannel('#duardo1', '123', 'duardo1'), -1);
        });
        it ('should return -2 with only id and channelName (not connected to server)', async () => {
            assert.equal(await addChannel('#duardo1', '123', 'testchannel'), -2);
        });
    });
    
    
    describe('botardo.removeChannel()', () => {
        removeChannel = botardo.__get__('removeChannel');
        it ('should return -1 if the channel object doesnt exist', async () => {
            assert.equal(await removeChannel('#duardo1', '199'), -1);
            assert.equal(await removeChannel('#duardo1'), -1);
        });
        it ('should return 1 with correct params and not exist (not connected to server)', async () => {
            channelsObjs['#testchannel'] = {id: '123', name: '#testchannel'};
            assert.equal(channelsObjs.hasOwnProperty('#testchannel'), true);
            assert.equal(await removeChannel('#duardo1', '123'), 1);
            assert.equal(channelsObjs.hasOwnProperty('#testchannel'), false);
        });
    });
    
    
    describe('botardo.addCommand()', () => {
        addCommand = botardo.__get__('addCommand');
        it ('should return -1 on duplicate command', async () => {
            assert.equal(await addCommand('#duardo1', 'ping', '3', '1', '0'), -1);
        });
        it('should return 1 with maxCooldown missing', async () => {
            db.sendQuery('BEGIN TRANSACTION;');
            assert.equal(await addCommand('#duardo1', 'testCMD', '3', '1', '0', '1'), 1);
            delete commandObjs['testCMD'];
            db.sendQuery('ROLLBACK;');
        });
        it('should return 1 with all correct params', async () => {
            db.sendQuery('BEGIN TRANSACTION;');
            assert.equal(await addCommand('#duardo1', 'testCMD', '3', '1', '0', '1', '600000'), 1);
            delete commandObjs['testCMD'];
            db.sendQuery('ROLLBACK;');
        });
    });
    
    
    describe('botardo.setBot()', () => {
        setBot = botardo.__get__('setBot');
        it ('should return -1 on empty params', async () => {
            assert.equal(await setBot(), -1);
        });
        describe('user privilege tests', () => {
            it ('should return -1 if modsCanEdit and normal user', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': false}, 'prefix', '!'), -1);
            });
            it ('should return -1 if :modsCanEdit and mod', async () => {
                assert.equal(await setBot('#fabzeef', {'user-id': '123', 'mod': true}, 'prefix', '!'), -1);
            });
            it ('should return 1 if !modsCanEdit and owner', async () => {
                assert.equal(await setBot('#fabzeef', {'user-id': '148973258', 'mod': false}, 'prefix', '!'), 1);
            });
            it ('should return 1 if modsCanEdit and owner', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '84800191', 'mod': false}, 'prefix', '!'), 1);
            });
            it ('should return 1 if modsCanEdit and mod', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123 ', 'mod': true}, 'prefix', '!'), 1);
            });
            it ('should return 1 if !modsCanEdit and dev', async () => {
                assert.equal(await setBot('#fabzeef', {'user-id': '84800191', 'mod': false}, 'prefix', '!'), 1);
                assert.equal(await setBot('#fabzeef', {'user-id': '84800191', 'mod': false}, 'modsCanEdit', 'false'), 1);
            });
            it ('should return -1 if not owner/dev and trying to change modsCanEdit', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'modsCanEdit', 'true'), -1);
                assert.equal(await setBot('#duardo1', {'user-id': '84800191', 'mod': false}, 'modsCanEdit', 'true'), 1);
            });
        });
        describe('parameter checks', () => {
            it ('should return -1 on unknown option', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'unknown', '!'), -1);
            });
            it ('should return -1 on wrong boolean value', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'modsCanEdit', 'wrong'), -1);
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'whileLive', 'wrong'), -1);
            });
            it ('should return -1 on wrong prefix size', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', 'thisprefixiswaytoolong'), -1);
            });
            it ('should return -1 on forbidden characters', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', '.'), -1);
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', './/'), -1);
            });
            it ('should return 1 on correct prefix', async () => {
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', '#'), 1);
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', '#testabc'), 1);
                assert.equal(await setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', '([]{})'), 1);
                setBot('#duardo1', {'user-id': '123', 'mod': true}, 'prefix', '!');
            });
        });
    });
    
    
    describe('botardo.setCommand()', () => {
        setCommand = botardo.__get__('setCommand');
        it ('should return -1 on empty params', async () => {
            assert.equal(await setCommand(), -1);
            assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown'), -1);
            assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra'), -1);
            
        });
        describe('parameter checks', () => {
            it ('should return -1 on unknown command', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'unknown', 'a', 'b'), -1);
            });
            it ('should return -1 if command devOnly', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'eval', 'cooldown', '3'), -1);
            });
            it ('should return -1 if command not changeable', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'setCommand', 'enabled', 'true'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ping', 'enabled', 'true'), -1);
            });
            it ('should return -1 on wrong cooldown value', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '0'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '-1'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '10000000'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', 'abc'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '0000'), -1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '2.3'), 1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '2,3'), 1);
            });
            it ('should return -1 on wrong enabled value', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'enabled', 'abc'), -1);
            });
            it ('should return 1 with correct parameters', async () => {
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'cooldown', '2'), 1);
                assert.equal(await setCommand('#duardo1', {'user-id': '123', 'mod': true}, 'ra', 'enabled', 'true'), 1);
            });
        });
    });
    
    
    describe('botardo.checkCommand()', () => {
        checkCommand = botardo.__get__('checkCommand');
        it ('should return -1 if devOnly command', async () => {
            assert.equal(await checkCommand('#duardo1', 'eval'), -1);
            assert.equal(await checkCommand('#duardo1', 'addCommand'), -1);
        });
    });
});


        
        
