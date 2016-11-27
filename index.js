"use strict";
var Discord = require('discord.js');
var request = require('request');
var creds = require('./auth.json');
var fs = require('fs');

class Team {
	constructor(capid, teamNum) {
		// captain user objects
		this.captain = capid;
		// team member objects (excludes captain)
		this.members = [];
		this.teamNum = teamNum;
	}
	get reset() {
		this.captain = 0;
		this.members = [];
	}
}

class Hero {
	constructor(name, role) {
		this.name = name;
		this.role = role;
	}
}

// global vars
/*
Pick States
0 - Not started
1 - Team 1 pick
2 - Team 2 pick
3 - Team 3 pick
4 - Team 4 pick
5 - Picking amount of teams
6 - Team 1 Captain Pick
7 - Team 2 Captain Pick
8 - Team 3 Captain Pick
9 - Team 4 Captain Pick
10 - Teams completed
 */
var pickState = 0;
var isTwoTeams = true;
// Picking steps
var twoTeams = [1,2,2,1,1,2,2,1,1,2];
var fourTeams = [1,2,3,4,4,3,2,1,1,2,3,4,4,3,2,1,1,2,3,4];
var pickStep = 0;
var pickedPlayers = [];
var teams = []; // array of Team objects
var roles = ['Offense', 'Defense', 'Tank', 'Support'];
var heroList = [
	new Hero('Genji', roles[0]),
	new Hero('McCree', roles[0]),
	new Hero('Pharah', roles[0]),
	new Hero('Reaper', roles[0]),
	new Hero('Solder 76', roles[0]),
	new Hero('Tracer', roles[0]),
	new Hero('Bastion', roles[1]),
	new Hero('Junkrat', roles[1]),
	new Hero('Mei', roles[1]),
	new Hero('Torbjorn', roles[1]),
	new Hero('Widowmaker', roles[1]),
	new Hero('D.Va', roles[2]),
	new Hero('Reinhardt', roles[2]),
	new Hero('Roadhog', roles[2]),
	new Hero('Winston', roles[2]),
	new Hero('Zarya', roles[2]),
	new Hero('Lucio', roles[4]),
	new Hero('Mercy', roles[4]),
	new Hero('Symmetra', roles[4]),
	new Hero('Zenyatta', roles[4]),
]
var listenTo = ""; // ID of user who has the bot's attention
var pickVoiceChannel = ""; // voice channel object where players are picked from
// accepted text channel id
var goonGeneralChannel = "252451798923739136";
//252461827361996810
//187021962357243904
/************** Functions **************/
// returns string of availible players in pool
function listAvailiblePlayers() {
	let playerMsg = "Select a player using the number next to their name \n";
	for(let p = 0; p < pickVoiceChannel.members.length; p++) {
		let currMember = pickVoiceChannel.members[p];
		if(pickedPlayers.indexOf(currMember.id) > -1) {
			playerMsg +=  (p + 1) + ") ~~" + getNick(currMember) + "~~\n" ;
		} else {
			playerMsg +=  (p + 1) + ") " + getNick(currMember) + "\n" ;
		}
	}
	return playerMsg;
}

// gets local server ID
function getNick(user) {
	if(user.voiceChannel == null) {
		console.log('User not in voice server!');
		return user.username;
	}
	let server = user.voiceChannel.server;
	return server.detailsOfUser(user).nick;
}

// get team list
function listTeams() {
	let teamMsg = "";
	for(let t = 0; t < teams.length; t++) {
		teamMsg += "__**Team " + (t + 1) + "**__\n";
		teamMsg += getNick(teams[t].captain) + "\n";
		for(let tm = 0; tm < teams[t].members.length; tm++) {
			teamMsg += getNick(teams[t].members[tm]) + "\n";
		}
		teamMsg += "----------------\n";
	}
	return teamMsg;
}

function getTeam(num) {
	for(var t = 0; t < teams.length; t++) {
		if(teams[t].teamNum == num) {
			return teams[t];
		}
	}
	return null;
}
/************** End Functions **************/

// initialize bot
var bot = new Discord.Client();
bot.loginWithToken(creds.token);

// indicate server is ready
bot.on("ready", function() {
	console.log("Overwatch InHouse Bot online");
	console.log("Authorized Servers:");
	for(let srv = 0; srv < bot.servers.length; srv++) {
		console.log(bot.servers[srv].name);
	}
});

bot.on("error", function() {
	console.log("I died");
});

// Text channel message events
bot.on("message", function(msg) {
	let msgTxt = msg.content.toLowerCase();
	if(msg.channel.id == goonGeneralChannel && (listenTo == "" || listenTo == msg.author.id)) {
		if(msgTxt == '/startpick') {
			// initialize team picking process, check for presence in general chat
			if(pickState == 0) {
				if(msg.author.voiceChannel == null || msg.author.voiceChannel.name != "General") {
					bot.sendMessage(msg.channel, "You must be in the General voice chat to start a team pick.");
				} else {
					pickVoiceChannel = msg.author.voiceChannel;
					pickState = 5;
					listenTo = msg.author.id;
					bot.sendMessage(msg.channel, "New team pick started! Anyone participating must be in General voice chat to be selected. " + getNick(msg.author) + ", please enter the amount of teams (2 or 4)");
				}
			} else {
				bot.sendMessage(msg.channel, "Team pick already in progress!");
			}
		} else if(msgTxt == '2' && pickState == 5) {
			// Setup for picking two teams
			isTwoTeams = true;
			pickState++;
			listenTo = "";
			bot.sendMessage(msg.channel, "Picking 2 teams. Type **/captain** to sign up as captain.");
		} else if(msgTxt == '4' && pickState == 5) {
			// Setup for picking four teams
			isTwoTeams = false;
			pickState++;
			listenTo = "";
			bot.sendMessage(msg.channel, "Picking 4 teams. Type **/captain** to sign up as captain.");
		} else if(msgTxt == '/captain' && pickState == 6) {
			// set team 1 captain
			teams.push(new Team(msg.author, 1));
			pickedPlayers.push(msg.author.id);
			pickState++;
			bot.sendMessage(msg.channel, getNick(msg.author) + " is captain of Team 1");
		} else if(msgTxt == '/captain' && pickState == 7) {
			if(pickedPlayers.indexOf(msg.author.id) == -1) {
				// set team 1 captain
				teams.push(new Team(msg.author, 2));
				pickedPlayers.push(msg.author.id);
				// start team building if only two teams
				if(!isTwoTeams) {
					bot.sendMessage(msg.channel, getNick(msg.author) + " is captain of Team 2");
					pickState++;
				} else {
					pickState = 1;
					pickStep = 0;
					listenTo = teams[0].captain.id;
					bot.sendMessage(msg.channel, getNick(msg.author) + " is captain of Team 2\n\n@" + getNick(teams[0].captain) + ". __**Team 1's pick**__\n" + listAvailiblePlayers());
				}
			}
		} else if(msgTxt == '/captain' && pickState == 8) {
			if(pickedPlayers.indexOf(msg.author.id) == -1) {
				// set team 3 captain
				teams.push(new Team(msg.author.id, 3));
				pickedPlayers.push(msg.author.id);
				pickState++;
				bot.sendMessage(msg.channel, getNick(msg.author) + " is captain of Team 3");
			}
		} else if(msgTxt == '/captain' && pickState == 9) {
			if(pickedPlayers.indexOf(msg.author.id) == -1) {
				// set team 4 captain
				teams.push(new Team(msg.author.id, 4));
				pickedPlayers.push(msg.author.id);
				// start team building
				pickState = 1;
				pickStep = 0;
				listenTo = teams[0].captain.id;
				bot.sendMessage(msg.channel, getNick(msg.author) + " is captain of Team 4\n\n@" + getNick(teams[0].captain) + ". __**Team 1's pick**__\n" + listAvailiblePlayers());
			}
		} else if(pickState >= 1 && pickState <= 4) {
			// team picking
			let pickNum = parseInt(msgTxt);
			if(!isNaN(pickNum)) {
				let selectedPlayer = pickVoiceChannel.members[pickNum - 1];
				if(pickedPlayers.indexOf(selectedPlayer.id) > -1) {
					bot.sendMessage(msg.channel, getNick(selectedPlayer) + " is already on a team!");
				} else {
					console.log("Pick state: " + pickState);
					getTeam(pickState).members.push(selectedPlayer);
					console.log("Added " + getNick(selectedPlayer) + " to team " + pickState);
					pickedPlayers.push(selectedPlayer.id);
					pickStep++;
					// setup next picking phase if there is one
					if(isTwoTeams) {
						if(pickStep < twoTeams.length) {
							let oldState = pickState;
							pickState = twoTeams[pickStep];
							listenTo = getTeam(pickState).captain.id;
							bot.sendMessage(msg.channel, getNick(selectedPlayer) + " assigned to **Team " + oldState + "**\n\n" + getNick(teams[pickState - 1].captain) + ". __**Team " + pickState + "'s pick**__\n" + listAvailiblePlayers());
						} else {
							pickState = 10;
							bot.sendMessage(msg.channel, "Team picking completed.\n\n" + listTeams());
						}
					} else {
						if(pickStep < fourTeams.length) {
							let oldState = pickState;
							pickState = fourTeams[pickStep];
							listenTo = getTeam(pickState).captain.id;
							bot.sendMessage(msg.channel, getNick(selectedPlayer) + " assigned to **Team " + oldState + "**\n\n" + getNick(teams[pickState - 1].captain) + ". __**Team " + pickState + "'s pick**__\n" + listAvailiblePlayers());
						} else {
							pickState = 10;
							bot.sendMessage(msg.channel, "Team picking completed.\n\n" + listTeams());
							listenTo = "";
						}
					}
				}
			}
		}
	}
	if(msgTxt == '/restartpick') {
		pickedPlayers = [];
		teams = [];
		listenTo = msg.author.id;
		pickState = 5;
		bot.sendMessage(msg.channel, "Team picking reset. Please select the number of teams you'd like to pick (2 or 4).");
	}
	if(msgTxt == '/teams') {
		if(teams.length > 0) {
			bot.sendMessage(msg.channel, listTeams());
		} else {
			bot.sendMessage(msg.channel, "No teams setup at this time!");
		}
	}
	if(msgTxt == "/listplayers") {
		pickVoiceChannel = msg.author.voiceChannel;
		bot.sendMessage(msg.channel, listAvailiblePlayers());
	}
	if(msgTxt == '/help') {
		bot.sendMessage(msg.channel, "Type /startpick to get started picking teams!");
	}
	if(msgTxt == 'hello' || msgTxt == 'hi') {
		bot.sendMessage(msg.channel, "Hello " + getNick(msg.author) + "!");
	}
});
