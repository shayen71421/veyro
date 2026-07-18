export const exploreSeedSources = [
  { findId:"aluva-manappuram-riverfront", sources:[
    { title:"Places of Interest — District Ernakulam", url:"https://ernakulam.nic.in/en/places-of-interest/", sourceType:"government", informationUsed:"Public place identity and district context", accessedAt:"2026-07-18" },
    { title:"Aluva Manappuram photograph metadata", url:"https://commons.wikimedia.org/wiki/Category:Aluva_Manappuram", sourceType:"reliable_secondary", informationUsed:"Location cross-check and coordinates", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Walking time is a conservative estimate from mapped location." },
  { findId:"aluva-palace-river-view", sources:[
    { title:"Places of Interest — District Ernakulam", url:"https://ernakulam.nic.in/en/places-of-interest/", sourceType:"government", informationUsed:"Aluva Palace identity and public-interest context", accessedAt:"2026-07-18" },
    { title:"Aluva Palace map", url:"https://mapcarta.com/W417780072", sourceType:"maps", informationUsed:"Coordinates and location cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Access to individual palace areas must be checked." },
  { findId:"kerala-museum-pathadipalam", sources:[
    { title:"Kerala Museum contact and visit information", url:"https://keralamuseum.org/get-in-touch/", sourceType:"official_venue", informationUsed:"Venue status, address and Pathadipalam proximity", accessedAt:"2026-07-18" },
    { title:"Kerala Museum map", url:"https://mapcarta.com/N1474339860", sourceType:"maps", informationUsed:"Coordinates and distance from metro cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Official venue says it is next door to Pathadipalam; UI time remains estimated." },
  { findId:"lulu-mall-edapally", sources:[
    { title:"LuLu Mall Kochi contact", url:"https://www.kochi.lulumall.in/our-contacts/", sourceType:"official_venue", informationUsed:"Venue identity and address", accessedAt:"2026-07-18" },
    { title:"LuLu Mall Kochi map", url:"https://mapcarta.com/W490280541", sourceType:"maps", informationUsed:"Coordinates and Edapally proximity", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Individual store hours vary." },
  { findId:"st-george-forane-church-edappally", sources:[
    { title:"Kerala Tourism — Kochi topic", url:"https://www.keralatourism.org/topic/kochi", sourceType:"official_tourism", informationUsed:"Edappally church identity", accessedAt:"2026-07-18" },
    { title:"St George Forane Church media category", url:"https://commons.wikimedia.org/wiki/Category:St._George%27s_Forane_Church,_Edappally", sourceType:"reliable_secondary", informationUsed:"Coordinates and location cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Respect worship and event access." },
  { findId:"changampuzha-park-cultural-stop", sources:[
    { title:"Changampuzha Park map", url:"https://mapcarta.com/W265588396", sourceType:"maps", informationUsed:"Park identity, coordinates and station proximity", accessedAt:"2026-07-18" },
    { title:"Changampuzha Samskarika Kendram", url:"https://changampuzhapark.com/", sourceType:"official_venue", informationUsed:"Cultural venue identity", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Map source places station about 160 metres away." },
  { findId:"oberon-mall-palarivattom", sources:[
    { title:"Oberon Mall official site", url:"https://oberonmall.com/?sf=2", sourceType:"official_venue", informationUsed:"Venue identity and current official presence", accessedAt:"2026-07-18" },
    { title:"Oberon Mall map", url:"https://mapcarta.com/W238698787", sourceType:"maps", informationUsed:"Coordinates and location cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Conservative walking estimate from Palarivattom." },
  { findId:"jln-stadium-kochi", sources:[
    { title:"Jawaharlal Nehru Stadium map", url:"https://mapcarta.com/W37768684", sourceType:"maps", informationUsed:"Venue identity, coordinates and metro proximity", accessedAt:"2026-07-18" },
    { title:"Greater Cochin Development Authority", url:"https://gcda.kerala.gov.in/", sourceType:"government", informationUsed:"Public authority context for stadium precinct", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Entry is event-dependent." },
  { findId:"centre-square-mg-road", sources:[
    { title:"Centre Square official site", url:"https://www.centresquaremallkochi.com/", sourceType:"official_venue", informationUsed:"Venue identity and official presence", accessedAt:"2026-07-18" },
    { title:"Centre Square map", url:"https://mapcarta.com/W264717765", sourceType:"maps", informationUsed:"Coordinates and MG Road location", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"No exact store hours are seeded." },
  { findId:"broadway-market-walk", sources:[
    { title:"Broadway Shopping — Kerala Tourism", url:"https://www.keralatourism.org/kochi/broadway-shopping-ernakulam.php", sourceType:"official_tourism", informationUsed:"District character and public shopping identity", accessedAt:"2026-07-18" },
    { title:"Broadway Kochi map search", url:"https://www.google.com/maps/search/?api=1&query=9.9816,76.2783", sourceType:"maps", informationUsed:"Coordinates and station proximity cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Outdoor market conditions and shop hours vary." },
  { findId:"marine-drive-promenade-kochi", sources:[
    { title:"Marine Drive Kochi — Kerala Tourism", url:"https://www.keralatourism.org/destination/marine-drive-kochi/546/", sourceType:"official_tourism", informationUsed:"Promenade identity and visitor context", accessedAt:"2026-07-18" },
    { title:"Marine Drive Ernakulam — Kerala Tourism", url:"https://www.keralatourism.org/kochi/marine-drive-ernakulam.php", sourceType:"official_tourism", informationUsed:"Location and waterfront character cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Weather-sensitive outdoor walk." },
  { findId:"durbar-hall-ground", sources:[
    { title:"Durbar Hall Grounds — Kerala Tourism", url:"https://www.keralatourism.org/kochi/durbar-hall-grounds-ernakulam.php", sourceType:"official_tourism", informationUsed:"Ground identity and cultural context", accessedAt:"2026-07-18" },
    { title:"Durbar Hall Ground map", url:"https://mapcarta.com/W264037666", sourceType:"maps", informationUsed:"Coordinates and nearby landmarks", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Event use can affect access." },
  { findId:"ernakulam-shiva-temple", sources:[
    { title:"Kerala Tourism — Kochi topic", url:"https://www.keralatourism.org/topic/kochi", sourceType:"official_tourism", informationUsed:"Temple identity and visitor context", accessedAt:"2026-07-18" },
    { title:"Durbar Hall Ground map", url:"https://mapcarta.com/W264037666", sourceType:"maps", informationUsed:"Nearby temple location cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Respect ritual and festival access." },
  { findId:"rajiv-gandhi-indoor-stadium", sources:[
    { title:"Regional Sports Centre facilities", url:"https://www.rsckochi.com/website/Facilities", sourceType:"official_venue", informationUsed:"Facility identity and operation", accessedAt:"2026-07-18" },
    { title:"Rajiv Gandhi Indoor Stadium map search", url:"https://www.google.com/maps/search/?api=1&query=9.9662,76.2993", sourceType:"maps", informationUsed:"Coordinates and station proximity cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Public access depends on facilities and events." },
  { findId:"vyttila-mobility-hub", sources:[
    { title:"Vyttila Mobility Hub — District Ernakulam", url:"https://ernakulam.nic.in/en/vyttila-mobility-hub/", sourceType:"government", informationUsed:"Public interchange identity and purpose", accessedAt:"2026-07-18" },
    { title:"Vyttila metro area map", url:"https://mapcarta.com/N9280367788", sourceType:"maps", informationUsed:"Hub and metro proximity cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Service information changes and must be checked." },
  { findId:"hill-palace-museum-tripunithura", sources:[
    { title:"Hill Palace — District Ernakulam", url:"https://ernakulam.nic.in/en/tourist-place/hill-palace/", sourceType:"government", informationUsed:"Museum identity and public visitor context", accessedAt:"2026-07-18" },
    { title:"Hill Palace Museum — Kerala Tourism", url:"https://www.keralatourism.org/destination/hill-palace-museum/182/", sourceType:"official_tourism", informationUsed:"Heritage museum cross-check", accessedAt:"2026-07-18" },
  ], locationVerified:true, stationProximityVerified:true, walkingTimeVerified:false, notes:"Longest seed walk; verify route and opening day before travelling." },
] as const;
