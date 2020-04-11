import { Fog } from '.';

export const dFarmers = [{
    id: 0,
    tileID: 24
}, {
    id: 1,
    tileID: 36
}]

export const dRegions = require("./tilemap").map;

const { MonsterKind } = require("./MonsterKind");
export const dMonsters = [{
    name: "gor1",
    type: MonsterKind.Gor,
    tileID: 8
}, {
    name: "gor2",
    type: MonsterKind.Gor,
    tileID: 20
}, {
    name: "gor3",
    type: MonsterKind.Gor,
    tileID: 21
}, {
    name: "gor4",
    type: MonsterKind.Gor,
    tileID: 26
}, {
    name: "gor5",
    type: MonsterKind.Gor,
    tileID: 48
}, { 
    name: "skral1",
    type: MonsterKind.Skral,
    tileID: 19
}]

export function dEventDeck() { 
    let map = require("./EventCardMap").map; 
    _shuffle(map);
    return map;
}

export function dFogs(): Map<number, Fog> {
    const fogIds = [8, 11, 12, 13, 49, 16, 32, 48, 42, 44, 47, 46, 64, 56, 63];
    const fogTypes = [Fog.EventCard, Fog.EventCard, Fog.EventCard, Fog.EventCard, Fog.EventCard, Fog.Strength, Fog.WillPower2, Fog.WillPower3, Fog.Gold, Fog.Gold, Fog.Gold, Fog.Gor, Fog.Gor, Fog.Wineskin, Fog.Brew];
    // TODO REMOVE: For testing monster jumping from fog
    // const fogTypes = [Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor, Fog.Gor];
    ////////////////////////////
    _shuffle(fogTypes);

    let newObj = new Map();
    for (var i = 0; i < fogIds.length; i++)
        newObj.set(fogIds[i], fogTypes[i])
    return newObj

}

export function dCastle(numPlayers) {
    let shields = 0;
    if (numPlayers === 2) {
        shields = 3;
    } else if (numPlayers === 3) {
        shields = 2;
    } else if (numPlayers === 4) {
        shields = 1;
    }

    return {
        numDefenseShields: shields,
        numDefenseShieldsUsed: 0
    }
}

// Prince's default should be that it doesn't exist
// export const dPrince = {
//     tile: {
//         id: -1
//     }
// }

export const dNarrator = {
    legendPosition: -1
}


function _shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}