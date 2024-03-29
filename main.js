
const fs = require("fs");
const URLLIB = require('url')

const request = require('request')
const htmlparser2 = require('htmlparser2')

// Default config
const config = {
	torrentPath: "C:/NON-OS/Torrent/autotorrent",
	feedUrl: "https://nyaa.si/user/SubsPlease?f=0&c=0_0&q=",
	titles: [
		"Mushoku Tensei",
		// "Tesla Note",
		// "Mieruko-chan",
		// "Sankaku Mado no Sotogawa wa Yoru",
		// "Tsuki to Laika to Nosferatu",
		// "Kyuuketsuki Sugu Shinu",
		// "Kyoukai Senki",
		// "Shinka no Mi - Shiranai Uchi ni Kachigumi Jinsei",
	],
	resolution: "720p",
	
	requestTimeOut: 10 * 1000,
	saveInterval: 10 * 60 * 1000,
	checkInterval: 60 * 60 * 1000,
};

let loadedGrabbed;
try { 
	loadedGrabbed = fs.readFileSync("grabbed.json")
	if (loadedGrabbed) {
		loadedGrabbed = loadedGrabbed.toString("utf8")
	}
} catch (err) { 
	loadedGrabbed = null
}

const grabbed = (loadedGrabbed) ? JSON.parse(loadedGrabbed) : {};


process.on("SIGINT", () => process.exit())
process.on("exit", () => {
	console.log("Actually exiting now");
	
	fs.writeFileSync("grabbed.json", JSON.stringify(grabbed, null, 4))
	
	console.log("Done saving, bye");
})

///(\[SubsPlease\])\s+(Mushoku Tensei)\s+-\s+(\d+)\s+\(720p\)\s+\[[0-9A-F]+\].mkv
///(\[HorribleSubs\])\s+(Dr\. Stone)\s-\s(\d+)\s\[720p\]\.mkv/g
const template = [
	"(\\[SubsPlease\\]) (",
	"TITLE",
	")(.*?)(\\d+) \\(",
	"RESOLUTION",
	"\\)\\s+\\[[0-9A-F]+\\]\\.mkv",
]
const regexes = config.titles.map( it => regexFor(it, config.resolution) )
function regexFor(title, resolution) {
	const filledTemplate = template.map((it) => {
		if (it === "TITLE") { return title; }
		if (it === "RESOLUTION") { return resolution; }
		return it;
	})

	return new RegExp(filledTemplate.join(""), "g");
}

function download(url, destination) {
	const base = URLLIB.parse(config.feedUrl);
	var opts = {
		url: base.protocol + "//" + base.hostname + url,
		timeout: config.requestTimeOut,
		encoding: null,
	}
	console.log(`${opts.url} => ${destination}`)
	request.get(opts, (err, res, body) => {
		if (err) {
			console.error("Error Downloading:")
			console.error(err);
		}
		console.log(`Wrote ${destination}`)
		fs.writeFile(destination, body, err2 => {
			if (err2) {
				console.error("Error Writing file:")
				console.error(err2)
			}
		})
	})
}

function NyaaBot() {
	
	let markedForLink = false;
	let title = "";
	
	const callbacks = {
		onopentag(name, attr) {
			//console.log(`<${name} ${JSON.stringify(attr)}>`) 
			if (name === "a") {
				if (markedForLink) {
					markedForLink = false;
					if (attr.href && (!grabbed[title] || grabbed[title] !== attr.href)) {
						console.log("Downloading : " + JSON.stringify(attr))
						download(attr.href, config.torrentPath+"/"+title+".torrent")
						grabbed[title] = attr.href
					}
					title = "";
				} else {
					if (attr.title) {
						//console.log("a title="+ attr.title)
						for (i in regexes) {
							var regex = regexes[i]
							const result = attr.title.match(regex);
							if (result) {
								markedForLink = true;
								title = result[0];
								break;
							}
						}
					}
				}
				
			}
		},
		ontext(text) {  },
		onclosetag(name) { }
	}
	for (c in callbacks) { callbacks[c].bind(this) }
	
	this.parse = function(body) {
		const parser = new htmlparser2.Parser(callbacks, { decodeEntities: true })
		parser.parseComplete(body)
	}
}

let bot = new NyaaBot()
let waiting = false;
function check() {
	if (!waiting) {
		console.log(new Date())
		console.log("checking")
		
		waiting = true;
		var opts = {
			url: config.feedUrl,
			timeout: config.requestTimeOut
		}
		request(opts, (err, res, body) => {
			waiting = false;
			if (err) {
				console.log(err);
				return
			}
			var code = res.statusCode;
			// console.log(code);

			try {
				bot.parse(body)

			} catch (err) {
				console.log("ERROR:");
				console.log(err);
			}
			//console.log(body.substring(0, Math.min(1000, body.length)))


		})
	}
}

check();
setInterval(() => { check(); }, config.checkInterval);
setInterval(() => { 
	fs.writeFile("grabbed.json", JSON.stringify(grabbed, null, 4), (err) => {
		if (err) { console.error(err); }
	})
}, config.saveInterval)
