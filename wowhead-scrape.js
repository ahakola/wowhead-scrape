const fs = require('fs');
const cheerio = require('cheerio');
//const request = require('request');
const got = require('got');
//const xray = require('x-ray')();
const xray = require('x-ray')({
	filters: {
		// Get rid of the <br> -elements
		replaceLineBreak: function (value) { return value.replace(/\<br\>/g, ''); },
	}
});

//const itemSlots = ['INVSLOT_HEAD', 'INVSLOT_SHOULDER', 'INVSLOT_BACK', 'INVSLOT_CHEST', 'INVSLOT_WRIST', 'INVSLOT_HAND', 'INVSLOT_WAIST', 'INVSLOT_LEGS', 'INVSLOT_FEET', 'INVSLOT_NECK', 'INVSLOT_FINGER1', 'INVSLOT_TRINKET1', 'INVSLOT_RANGED'];
//const itemRegex = /\/(?<linkType>[a-z]+)=(?<linkId>[0-9]+)/;
const itemRegex = /\/([a-z]+)=([0-9]+)/;
const itemNameRegex = /\"\>(?<itemName>\D+)\<\/a>/;
const questRegex = / \(Quest\)| \(quest\)/;
const soldByRegex = /Sold By|Badges at| Spirit Shard| Badge of Justice/;
const arenaVendorRegex = /(?:Arena|PVP) (?:Vendor|Reward)|(?:Arena|Honor) Points|Mark of Honor|\d,\d{3} |Vendor TBD - Zone TBD/i; // '\d,\d{3} ' -> '3,150 points' & '1,850 rating'
const reputationRegex = / - (?:Exalted|Revered|Honored|Friendly)/;
const dropRegex = /(?:World|Trash|Zone) Drop|Trash mobs/i;
const craftedRegex = /Pattern: |Plans: /;
const armorTokenRegex = /(?:Helm|Pauldrons|Gloves|Chestguard|Leggings|Gloves) of the Fallen /;

const dir = './ReadyFiles';
if (!fs.existsSync(dir)){
	// Create dir if it doesn't exist already
	fs.mkdirSync(dir);
};

function processHtmlTable(table, url, outputFile, index, tableHtmlList_lenght) {
	if (index == 0) {
		let firstLine = '	-- ' + url + '\n'
		fs.writeFile(dir + '/' + outputFile, firstLine, function (err) {
			if (err) return console.log(err);
			//console.log(' -', outputFile);
		});
	}

	const $ = cheerio.load(table);
	let itemCount = 0;
	$(table)
		.find('tr')
		.each(function (i, row) {

			//console.log(i, $(row).text().trim()) //, $(row).html().trim())
			let rowTextData = [];
			let rowHtmlData = [];

			const cells = $(row).find('td');
			cells.each((j, cell) => {

				const cellText = $(cell).text(); //.trim();
				const cellHtml = $(cell).html(); //.trim();

				//console.log(i, j, cellText, cellHtml);
				//console.log(i, j, cellText);
				rowTextData[j] = cellText;
				rowHtmlData[j] = cellHtml;
			});

			//console.log(rowTextData.length, rowTextData, rowHtmlData.length, rowHtmlData)

			if (rowTextData[0] && rowTextData[3]) { // Proper BiS-list table

				let linkData = [];
				for (let t = 0; t < rowHtmlData.length; t++) {
					const linkFound = rowHtmlData[t] ? rowHtmlData[t].match(itemRegex) : false;
					
					linkData[t] = linkFound;
					/*if (linkFound) {
						console.log(linkFound.groups.linkType, linkFound.groups.linkId);
					};*/
				};
				//console.log(linkData)
				if (linkData[1] && linkData[1][2] && rowTextData[1].trim() != 'PMC') {
					// PMC is some Primal Mooncloth theorycrafting in table form at Phase1 Priest Healing url and it will contaminate the bis-list

					//console.log(linkData[1][2], rowTextData[1])

					const matchQuest = rowTextData[3].match(questRegex);
					const matchSoldBy = rowTextData[3].match(soldByRegex);
					const matchArenaVendor = rowTextData[4] ? (rowTextData[4].match(arenaVendorRegex) || rowTextData[3].match(arenaVendorRegex)) : rowTextData[3].match(arenaVendorRegex);
					const matchReputation = rowTextData[3].match(reputationRegex);
					const matchDrop = rowTextData[4] ? (rowTextData[4].match(dropRegex) || rowTextData[3].match(dropRegex)) : rowTextData[3].match(dropRegex);
					const matchCrafted = rowTextData[4] ? (rowTextData[4].match(craftedRegex) || rowTextData[3].match(craftedRegex)) : rowTextData[3].match(craftedRegex);
					const matchToken = rowTextData[4] ? (rowTextData[4].match(armorTokenRegex) || rowTextData[3].match(armorTokenRegex)) : rowTextData[3].match(armorTokenRegex);
					//console.log(matchQuest);

					let source = 'drop';
					// Try to reduce all these different options down to 'drop', 'quest', 'vendor' and 'crafted'
					if (
						matchSoldBy || matchArenaVendor || matchReputation || rowTextData[3] == 'PVP' ||
						(rowTextData[3].toLowerCase() == 'pvp vendor' || (rowTextData[4] && rowTextData[4].toLowerCase() == 'pvp vendor'))
					) {
						source = 'vendor';
					} else if (matchQuest || rowTextData[3] == 'Quest') {
						source = 'quest';
					} else if (matchDrop || matchToken) {
						source = 'drop';
					} else if (matchCrafted || (linkData[3] && linkData[3][1] == 'spell') || rowTextData[3] == 'Goblin Engineering') {
						source = 'crafted';
					} else if (
						/*rowTextData[3] == 'Opera Event' || rowTextData[3] == 'Karazhan Chess Event' || rowTextData[3] == 'Any Opera Event' || rowTextData[3] == 'Opera eventShared' ||
						rowTextData[3] == 'Opera EventThe Crone' || rowTextData[3] == 'Opera EventThe Big Bad Wolf' || rowTextData[3] == 'Opera EventRibbon of Sacrifice and Ribbon of Sacrifice' ||
						rowTextData[3] == 'Magtheridon\'s Head from Magtheridon' || rowTextData[3] == 'Magtheridon\'s Head - Magtheridon\'s Lair'*/
						rowTextData[3] == 'Karazhan Chess Event' || rowTextData[3].match(/Opera Event/i) || rowTextData[3].match(/Magtheridon\'s Head/i)
					) {
						// Special case for new raid:
						// Karazhan Opera & Chess Event
						// Magtheridon's Head from Magtheridon - Magtheridon's Lair, Magtheridon's Head - Magtheridon's Lair
						source = 'drop';
					} else if (
						/*rowTextData[3] == '3 Drake Bosses' || rowTextData[3] == 'Splinter of Atiesh - Naxxramas' || rowTextData[3] == 'The Phylactery of Kel\'Thuzad -  Classic Naxxramas' || 
						rowTextData[3] == 'The Phylactery of Kel\'Thuzad from Kel\'Thuzad' || rowTextData[3] == 'Frame of Atiesh' || rowTextData[3] == 'Eye of C\'Thun dropped by C\'Thun - Temple of Ahn\'Qiraj' ||
						rowTextData[3] == 'Frame of Atiesh - Naxxramas' || (rowTextData[3] == 'Various Bosses' && rowTextData[4] && rowTextData[4] == 'Molten CoreWoW Classic')*/
						rowTextData[3] == '3 Drake Bosses' || rowTextData[3].match(/of Atiesh/i) || rowTextData[3].match(/The Phylactery of Kel\'Thuzad/i) ||
						rowTextData[3].match(/Eye of C\'Thun/i) || (rowTextData[3] == 'Various Bosses' && rowTextData[4] && rowTextData[4] == 'Molten CoreWoW Classic')
					) {
						// Special case for old raids:
						// 3 Drake Bosses - Blackwing Lair (that is apparently still relevant)
						// Splinter of Atiesh - Naxxramas, Frame of Atiesh, Frame of Atiesh - Naxxramas
						// The Phylactery of Kel'Thuzad -  Classic Naxxramas
						// Eye of C'Thun dropped by C'Thun - Temple of Ahn'Qiraj
						// Various Bosses - Molten CoreWoW Classic
						source = 'drop'
					} else if (rowTextData[3] == 'Cache of the Legion') {
						// Special case for dungeons:
						// Cache of the Legion - The Mechanar
						source = 'drop'
					} else if (linkData[3]) {
						if (linkData[3][1] == 'npc' || linkData[3][1] == 'zone' || linkData[3][1] == 'item' || linkData[3][1] == 'object') {
							// Objects:
							// Reinforced Fel Iron Chest - Hellfire Ramparts
							// Cache of the Legion - The Mechanar
							// Dust Covered Chest - Karazhan (Chess Event)
							// Four Horsemen Chest - Naxxramas
							source = 'drop';
						} else if (linkData[3][1] == 'quest') {
							source = 'quest';
						} else if (linkData[3][1] == 'spell') {
							source = 'crafted';
						} else if (linkData[3][1] == 'faction') {
							source = 'vendor'
						} else {
							source  = '!' + linkData[3][1];
						};
					} else if (rowTextData[3] == '5item=23449' && rowTextData[4] && rowTextData[4] == 'Nakodu') {
						// Special case, Pre-Raid DPS Priest Weapon #3
						// source = "!null"
						// preciseSource = "5item=23449 - Nakodu"
						source = 'crafted';
						rowTextData[3] = rowTextData[1];
						rowTextData[4] = 'Plans: Eternium Runed Blade';
					} else {
						source = '!null';
					};
					let preciseSource = (matchQuest) ? rowTextData[3].replace(questRegex, '') : rowTextData[3];
					if (rowTextData[4]) {
						preciseSource = preciseSource + ' - ' + rowTextData[4];
					};

					const matchItemName = rowHtmlData[1].match(itemNameRegex);
					let itemName = (matchItemName) ? matchItemName.groups.itemName : rowTextData[1];
					itemName = itemName.replace(/&apos;/g, '\'');
					//console.log(' -', itemName);

					// This is more trouble than anything at this point, so dropping it all together
					//let slotName = (index - 4 < itemSlots.length) ? itemSlots[index - 5] : (index + 1 == tableHtmlList_lenght) ? itemSlots[itemSlots.length - 1] : false;
					//console.log(index, itemSlots.length, tableHtmlList_lenght);

					//let newLine = '				[' + linkData[1][2] + '] = { -- ' + itemName + '\n		rank = ' + i + ',\n		slot = ' + slotName + ',\n		source = "' + source + '",\n		preciseSource = "' + preciseSource + '"\n				},\n';
					let newLine = '	[' + linkData[1][2] + '] = { -- ' + itemName + '\n		rank = ' + i + ',\n		source = "' + source + '",\n		preciseSource = "' + preciseSource + '"\n	},\n';
					fs.appendFile(dir + '/' + outputFile, newLine, function (err) {
						if (err) return console.log(err);
						//console.log('	-', itemName);
					});
					//console.log(' ->', itemName, i, source, preciseSource, '\n');
					if (source != 'drop' && source != 'quest' && source != 'vendor' && source != 'crafted') {
						console.log('\n ->', itemName, i, source, preciseSource, rowTextData[3], rowHtmlData[3]);
					};
					itemCount++;
				};

			};
		});

	//console.log(itemCount);
	return itemCount;
	//return true;
}

function getBiSitems(url, outputFile) {
	//return new Promise(function(resolve, reject) {

		//console.log(url, outputFile);

		// Moving from 'request' to 'got', because 'request' has been deprecated.
		// This still works, so nothing wrong with it (apart from the Promise -parts
		// since it didn't work in the first place, some of it has been removed).
		/*
		const requestOptions = {
			method: 'GET',
			url: url,
		}

		request.get(requestOptions, function(err, response, body) {
			if (err) {
				return reject(err);
			};
			if (response.statusCode >= 400) {
				return reject(new Error('The website requested returned an error!'));
			};
			xray(body, ['table@html'])(function (error, tableHtmlList) {
				if (error) {
					return reject(error);
				};
				//resolve(tableHtmlList.map(function(table, index) {
				tableHtmlList.map(function(table, index) {
					table = '<table>' + table + '</table>';
					//console.log('index:', index, table)

					return processHtmlTable(table, url, outputFile, index, tableHtmlList.length)
				});
				//}));
			});
		});
		*/

		const start = new Date()
		got(url).then(response => {
			//xray(response.body, ['table@html'])(function (error, tableHtmlList) {
			xray(response.body, ['table@html | replaceLineBreak'])(function (error, tableHtmlList) { // <br> -elements begone!
				if (error) {
					return console.log(error);
				};
				let itemCount = 0
				tableHtmlList.map(function(table, index) {
					table = '<table>' + table + '</table>';
					itemCount += processHtmlTable(table, url, outputFile, index, tableHtmlList.length);
				});
				if (itemCount > 0) {
					const executionTime = new Date() - start
					console.log(' - %s, added %d items in %dms', outputFile, itemCount, executionTime);
				}
			});
		}).catch(err => {
			console.log(err);
		});

	//});
};


linkArray = {
	// https://tbc.wowhead.com/news/best-in-slot-pre-raid-gear-recommendations-for-burning-crusade-classic-322607
	'Pre-Raid': {
		Warrior: {
			DPS: 'https://tbc.wowhead.com/guides/warrior-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Tank: 'https://tbc.wowhead.com/guides/protection-warrior-tank-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Paladin: {
			Holy: 'https://tbc.wowhead.com/guides/holy-paladin-healer-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Protection: 'https://tbc.wowhead.com/guides/paladin-tank-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Retribution: 'https://tbc.wowhead.com/guides/retribution-paladin-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Priest: {
			Healing: 'https://tbc.wowhead.com/guides/priest-healer-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			DPS: 'https://tbc.wowhead.com/guides/shadow-priest-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Shaman: {
			Elemental: 'https://tbc.wowhead.com/guides/elemental-shaman-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Enhancement: 'https://tbc.wowhead.com/guides/enhancement-shaman-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Restoration: 'https://tbc.wowhead.com/guides/shaman-healer-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Druid: {
			Balance: 'https://tbc.wowhead.com/guides/balance-druid-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			'Feral-Tank': 'https://tbc.wowhead.com/guides/feral-druid-tank-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			'Feral-DPS': 'https://tbc.wowhead.com/guides/feral-druid-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Restoration: 'https://tbc.wowhead.com/guides/druid-healer-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Rogue: {
			DPS: 'https://tbc.wowhead.com/guides/rogue-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Mage: {
			DPS: 'https://tbc.wowhead.com/guides/mage-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Warlock: {
			Affliction: 'https://tbc.wowhead.com/guides/affliction-warlock-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Demonology: 'https://tbc.wowhead.com/guides/demonology-warlock-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Destruction: 'https://tbc.wowhead.com/guides/destruction-warlock-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Hunter: {
			BeastMastery: 'https://tbc.wowhead.com/guides/beast-mastery-hunter-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Marksmanship: 'https://tbc.wowhead.com/guides/marksmanship-hunter-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow',
			Survival: 'https://tbc.wowhead.com/guides/survival-hunter-dps-pre-raid-best-in-slot-gear-burning-crusade-classic-wow'
		}
	},
	// https://tbc.wowhead.com/news/best-in-slot-gear-recommendations-for-burning-crusade-classic-phase-one-322608'
	'Phase1': {
		Warrior: {
			DPS: 'https://tbc.wowhead.com/guides/warrior-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Tank: 'https://tbc.wowhead.com/guides/protection-warrior-tank-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Paladin: {
			Holy: 'https://tbc.wowhead.com/guides/holy-paladin-healer-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Protection: 'https://tbc.wowhead.com/guides/paladin-tank-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Retribution: 'https://tbc.wowhead.com/guides/retribution-paladin-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Priest: {
			Healing: 'https://tbc.wowhead.com/guides/priest-healer-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			DPS: 'https://tbc.wowhead.com/guides/shadow-priest-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Shaman: {
			Elemental: 'https://tbc.wowhead.com/guides/elemental-shaman-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Enhancement: 'https://tbc.wowhead.com/guides/enhancement-shaman-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Restoration: 'https://tbc.wowhead.com/guides/shaman-healer-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Druid: {
			Balance: 'https://tbc.wowhead.com/guides/balance-druid-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			'Feral-Tank': 'https://tbc.wowhead.com/guides/feral-druid-tank-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			'Feral-DPS': 'https://tbc.wowhead.com/guides/feral-druid-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Restoration: 'https://tbc.wowhead.com/guides/druid-healer-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Rogue: {
			DPS: 'https://tbc.wowhead.com/guides/rogue-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Mage: {
			DPS: 'https://tbc.wowhead.com/guides/mage-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Warlock: {
			Affliction: 'https://tbc.wowhead.com/guides/affliction-warlock-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Demonology: 'https://tbc.wowhead.com/guides/demonology-warlock-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Destruction: 'https://tbc.wowhead.com/guides/destruction-warlock-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		},
		Hunter: {
			BeastMastery: 'https://tbc.wowhead.com/guides/beast-mastery-hunter-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Marksmanship: 'https://tbc.wowhead.com/guides/marksmanship-hunter-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow',
			Survival: 'https://tbc.wowhead.com/guides/survival-hunter-dps-karazhan-best-in-slot-gear-burning-crusade-classic-wow'
		}
	}
};


// First two elements: 'node' and 'the path to your script'
let cmdArgs = process.argv.slice(2);
//console.log('Args: ', cmdArgs, cmdArgs.length);

const automationMode = 1;
/*
	1	Generate all lists from built-in array
		Can be bit scetchy since the asynchronous nature of things can cause
		malformation of the outputFile. I have to try to fix that at some
		point. Until then, use the provided batch-files to run the list one
		by one for better results.

	2	Single run from settings
		Generate single phase/class/spec list based on the settings below.
		Good for testing things.
		- Hunter: foobar
		- Priest: Pre-Raid DPS, something funky with #3 weapon
*/
const phaseKey = 'Pre-Raid';
const classKey = 'Hunter';
const specKey = 'Survival';


if (cmdArgs.length == 2) {
	console.log('\n[url] and [outputFile] detected, trying to do some scraping...\n');
	getBiSitems(cmdArgs[0], cmdArgs[1]);
	//console.log(' -', dir + '/' + cmdArgs[1]);
} else {
	console.log('\n,----------------------------.');
	console.log('|   --- wowhead scrape ---   |');
	console.log('`----------------------------´');
	console.log('For manual use, call this script with 2 args:');
	console.log('\n	node.exe wowhead-scrape.js [url] [outputFile]');
	console.log('\n------------------------------\n');
	if (automationMode == 1) {
		console.log('No [url] and [outputFile] detected, generating the built-in lists...\n');
		for (let phaseKey in linkArray) {
			for (let classKey in linkArray[phaseKey]) {
				for (let specKey in linkArray[phaseKey][classKey]) {
					let fileName = phaseKey + '-' + classKey + '-' + specKey + '.txt';
					getBiSitems(linkArray[phaseKey][classKey][specKey], fileName);
					//console.log(' -', dir + '/' + fileName);
				};
			};
		};
	} else if (automationMode == 2) {
		console.log('No [url] and [outputFile] detected, generating single lists...\n');
		let fileName = phaseKey + '-' + classKey + '-' + specKey + '.txt';
		getBiSitems(linkArray[phaseKey][classKey][specKey], fileName);
	};
};