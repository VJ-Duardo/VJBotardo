var countryCodes = [
["afghanistan", "af", "afg"],
["albania", "al", "alb"],
["algeria", "dz", "dza"],
["american samoa", "as", "asm"],
["andorra", "ad", "and"],
["angola", "ao", "ago"],
["anguilla", "ai", "aia"],
["antarctica", "aq", "ata"],
["antigua and barbuda", "ag", "atg"],
["argentina", "ar", "arg"],
["armenia", "am", "arm"],
["aruba", "aw", "abw"],
["australia", "au", "aus"],
["austria", "at", "aut"],
["azerbaijan", "az", "aze"],
["bahamas", "bs", "bhs"],
["bahrain", "bh", "bhr"],
["bangladesh", "bd", "bgd"],
["barbados", "bb", "brb"],
["belarus", "by", "blr"],
["belgium", "be", "bel"],
["belize", "bz", "blz"],
["benin", "bj", "ben"],
["bermuda", "bm", "bmu"],
["bhutan", "bt", "btn"],
["bolivia", "bo", "bol"],
["bosnia and herzegovina", "ba", "bih"],
["botswana", "bw", "bwa"],
["bouvet island", "bv", "bvt"],
["brazil", "br", "bra"],
["british indian ocean territory", "io", "iot"],
["brunei", "bn", "brn"],
["bulgaria", "bg", "bgr"],
["burkina faso", "bf", "bfa"],
["burundi", "bi", "bdi"],
["cambodia", "kh", "khm"],
["cameroon", "cm", "cmr"],
["canada", "ca", "can"],
["cabo verde", "cv", "cpv"],
["cayman islands", "ky", "cym"],
["central african republic", "cf", "caf"],
["chad", "td", "tcd"],
["chile", "cl", "chl"],
["china", "cn", "chn"],
["christmas island", "cx", "cxr"],
["cocos (keeling) islands", "cc", "cck"],
["colombia", "co", "col"],
["comoros", "km", "com"],
["congo (brazzaville)", "republic of the congo", "cg", "cog"],
["congo (kinshasa)", "democratic republic of the congo", "congo", "drc", "cd", "cod"],
["cook islands", "ck", "cok"],
["costa rica", "cr", "cri"],
["cote d'ivoire", "ivory coast", "ci", "civ"],
["croatia", "hr", "hrv"],
["cuba", "cu", "cub"],
["cyprus", "cy", "cyp"],
["czechia", "czech republic", "cz", "cze"],
["denmark", "dk", "dnk"],
["djibouti", "dj", "dji"],
["dominica", "dm", "dma"],
["dominican republic", "do", "dom"],
["ecuador", "ec", "ecu"],
["egypt", "eg", "egy"],
["el salvador", "sv", "slv"],
["equatorial guinea", "gq", "gnq"],
["eritrea", "er", "eri"],
["estonia", "ee", "est"],
["ethiopia", "et", "eth"],
["falkland islands (malvinas)", "fk", "flk"],
["faroe islands", "fo", "fro"],
["fiji", "fj", "fji"],
["finland", "fi", "fin"],
["france", "fr", "fra"],
["french guiana", "gf", "guf"],
["french polynesia", "pf", "pyf"],
["french southern territories", "tf", "atf"],
["gabon", "ga", "gab"],
["gambia", "gm", "gmb"],
["georgia", "ge", "geo"],
["germany", "de", "deu"],
["ghana", "gh", "gha"],
["gibraltar", "gi", "gib"],
["greece", "gr", "grc"],
["greenland", "gl", "grl"],
["grenada", "gd", "grd"],
["guadeloupe", "gp", "glp"],
["guam", "gu", "gum"],
["guatemala", "gt", "gtm"],
["guernsey", "gg", "ggy"],
["guinea", "gn", "gin"],
["guinea-bissau", "gw", "gnb"],
["guyana", "gy", "guy"],
["haiti", "ht", "hti"],
["heard island and mcdonald islands", "hm", "hmd"],
["holy see", "va", "vat"],
["honduras", "hn", "hnd"],
["hong kong", "hk", "hkg"],
["hungary", "hu", "hun"],
["iceland", "is", "isl"],
["india", "in", "ind"],
["indonesia", "id", "idn"],
["iran", "ir", "irn"],
["iraq", "iq", "irq"],
["ireland", "ie", "irl"],
["isle of man", "im", "imn"],
["israel", "il", "isr"],
["italy", "it", "ita"],
["jamaica", "jm", "jam"],
["japan", "jp", "jpn"],
["jersey", "je", "jey"],
["jordan", "jo", "jor"],
["kazakhstan", "kz", "kaz"],
["kenya", "ke", "ken"],
["kiribati", "ki", "kir"],
["north korea", "kp", "prk"],
["kosovo", "xk", "xkx"],
["korea", "south korea", "kr", "kor"],
["kuwait", "kw", "kwt"],
["kyrgyzstan", "kg", "kgz"],
["laos", "la", "lao"],
["latvia", "lv", "lva"],
["lebanon", "lb", "lbn"],
["lesotho", "ls", "lso"],
["liberia", "lr", "lbr"],
["libya", "ly", "lby"],
["liechtenstein", "li", "lie"],
["lithuania", "lt", "ltu"],
["luxembourg", "lu", "lux"],
["macao", "mo", "mac"],
["macedonia, the former yugoslav republic of", "mk", "mkd"],
["madagascar", "mg", "mdg"],
["malawi", "mw", "mwi"],
["malaysia", "my", "mys"],
["maldives", "mv", "mdv"],
["mali", "ml", "mli"],
["malta", "mt", "mlt"],
["marshall islands", "mh", "mhl"],
["martinique", "mq", "mtq"],
["mauritania", "mr", "mrt"],
["mauritius", "mu", "mus"],
["mayotte", "yt", "myt"],
["mexico", "mx", "mex"],
["micronesia", "fm", "fsm"],
["moldova", "md", "mda"],
["monaco", "mc", "mco"],
["mongolia", "mn", "mng"],
["montenegro", "me", "mne"],
["montserrat", "ms", "msr"],
["morocco", "ma", "mar"],
["mozambique", "mz", "moz"],
["burma", "myanmar", "mm", "mmr"],
["namibia", "na", "nam"],
["nauru", "nr", "nru"],
["nepal", "np", "npl"],
["netherlands", "nl", "nld"],
["netherlands antilles", "an", "ant"],
["new caledonia", "nc", "ncl"],
["new zealand", "nz", "nzl"],
["nicaragua", "ni", "nic"],
["niger", "ne", "ner"],
["nigeria", "ng", "nga"],
["niue", "nu", "niu"],
["norfolk island", "nf", "nfk"],
["northern mariana islands", "mp", "mnp"],
["norway", "no", "nor"],
["oman", "om", "omn"],
["pakistan", "pk", "pak"],
["palau", "pw", "plw"],
["occupied palestinian territory", "ps", "pse"],
["panama", "pa", "pan"],
["papua new guinea", "pg", "png"],
["paraguay", "py", "pry"],
["peru", "pe", "per"],
["philippines", "ph", "phl"],
["pitcairn", "pn", "pcn"],
["poland", "pl", "pol"],
["portugal", "pt", "prt"],
["puerto rico", "pr", "pri"],
["qatar", "qa", "qat"],
["réunion", "re", "reu"],
["romania", "ro", "rou"],
["russia", "ru", "rus"],
["rwanda", "rw", "rwa"],
["saint helena, ascension and tristan da cunha", "sh", "shn"],
["saint kitts and nevis", "kn", "kna"],
["saint lucia", "lc", "lca"],
["saint pierre and miquelon", "pm", "spm"],
["saint vincent and the grenadines", "vc", "vct"],
["samoa", "ws", "wsm"],
["san marino", "sm", "smr"],
["sao tome and principe", "st", "stp"],
["saudi arabia", "sa", "sau"],
["senegal", "sn", "sen"],
["serbia", "rs", "srb"],
["seychelles", "sc", "syc"],
["sierra leone", "sl", "sle"],
["singapore", "sg", "sgp"],
["slovakia", "sk", "svk"],
["slovenia", "si", "svn"],
["solomon islands", "sb", "slb"],
["somalia", "so", "som"],
["south africa", "za", "zaf"],
["south georgia and the south sandwich islands", "gs", "sgs"],
["south sudan", "ss", "ssd"],
["spain", "es", "esp"],
["sri lanka", "lk", "lka"],
["sudan", "sd", "sdn"],
["suriname", "sr", "sur"],
["svalbard and jan mayen", "sj", "sjm"],
["eswatini", "swaziland", "sz", "swz"],
["sweden", "se", "swe"],
["switzerland", "ch", "che"],
["syria", "sy", "syr"],
["taiwan", "tw", "twn"],
["tajikistan", "tj", "tjk"],
["tanzania", "tz", "tza"],
["thailand", "th", "tha"],
["timor-leste", "tl", "tls"],
["togo", "tg", "tgo"],
["tokelau", "tk", "tkl"],
["tonga", "to", "ton"],
["trinidad and tobago", "tt", "tto"],
["tunisia", "tn", "tun"],
["turkey", "tr", "tur"],
["turkmenistan", "tm", "tkm"],
["turks and caicos islands", "tc", "tca"],
["tuvalu", "tv", "tuv"],
["uganda", "ug", "uga"],
["ukraine", "ua", "ukr"],
["united arab emirates", "ae", "are", "uae"],
["united kingdom", "gb", "gbr","uk"],
["us", "united states",  "usa"],
["united states minor outlying islands", "um", "umi"],
["uruguay", "uy", "ury"],
["uzbekistan", "uz", "uzb"],
["vanuatu", "vu", "vut"],
["venezuela", "ve", "ven"],
["vietnam", "vn", "vnm"],
["british virgin islands", "vg", "vgb"],
["us virgin islands", "vi", "vir"],
["wallis and futuna", "wf", "wlf"],
["western sahara", "eh", "esh"],
["yemen", "ye", "yem"],
["zambia", "zm", "zmb"],
["zimbabwe", "zw", "zwe"]
]


// Converts Regional Indicator Symbols (RIS) to the corresponding latin character. Ex: 🇦--> A
function emojiToLetter(RIS){
	let codepointHex = parseInt(RIS.codePointAt(0).toString(16),16);
	if ( codepointHex >= 0x1F1E6 && codepointHex <= 0x1F1FF ){
	latinChar = String.fromCharCode(codepointHex - 0x1F1E6 + 65);
	return latinChar;
	}
	else{
		return RIS;
	}
}


module.exports.countryCodes = countryCodes;
module.exports.emojiToLetter = emojiToLetter;