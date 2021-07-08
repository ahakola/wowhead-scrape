# wowhead-scrape

BiS-list scraper WIP made to scrape BiS-data from [tbc.wowhead.com](https://tbc.wowhead.com) for BCClassic to be used with [Pretty Good Items](https://github.com/ahakola/PrettyGoodItems) -addon.

I couldn't get the `Promise` working (no skillz), so this runs asynchronously if you make it process all the urls at once. And that probably causes some issues with output-files cutting short (probably has something to do with `fs.writeFile` and `fs.appendFile` being busy in another execution path when trying to call them) and item-data being written to output-files in wrong order (or to wrong files, didn't investigate too much, so much overlapping data). I suggest running your urls with this script one by one (with provided batch-files for example).

## Usage

Maybe this works, or not... I'm not that good with JavaScript, but let's try anyway.

- Download and install nodejs - [https://nodejs.org](https://nodejs.org) (I used 13.6.0 so that or any higher should do)
- Download and extract [https://github.com/ahakola/wowhead-scrape/archive/main.zip](https://github.com/ahakola/wowhead-scrape/archive/main.zip)
- In wowhead-scrape-main command:
```
npm install
node wowhead-scrape url outputFile
```
- Or use the included Windows batch-files
- Or run the script without `url` and `outputFile` to use the built in lists:
```
node wowhead-scrape
```

Here are list of the BiS-lists I used to write and test this script with:

- [Best in Slot Pre-Raid Gear Recommendations for Burning Crusade Classic](https://tbc.wowhead.com/news/best-in-slot-pre-raid-gear-recommendations-for-burning-crusade-classic-322607)
- [Best in Slot Gear Recommendations for Burning Crusade Classic Phase One](https://tbc.wowhead.com/news/best-in-slot-gear-recommendations-for-burning-crusade-classic-phase-one-322608)