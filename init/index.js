require('dotenv').config();
const mongoose = require("mongoose");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const initData = require("./data.js");
const Listing = require("../modules/listing.js");

const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust';
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

main()
.then(()=> {
    console.log("connected to DB");
})
.catch((err)=> {
    console.log(err);
})
async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async()=> {
    await Listing.deleteMany({});

    const listingsWithGeometry = await Promise.all(
        initData.data.map(async (obj) => {
            const response = await geocodingClient
                .forwardGeocode({
                    query: obj.location,
                    limit: 1,
                })
                .send();

            const feature = response.body.features[0];
            return {
                ...obj,
                owner: '6aa8ec30ff384af7b906dba0',
                geometry: feature.geometry,
            };
        })
    );

    await Listing.insertMany(listingsWithGeometry);
    console.log("data was initialized with map coordinates");
};

initDB();