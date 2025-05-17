const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });




module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    //res.render("listings/index.ejs", { allListings });
    
        try {
            let { category, location } = req.query;

            let filter = {};

            if (category && category.toLowerCase() !== "all") {
                filter.category = category.toLowerCase();
            }

            if (location) {
                filter.location = { $regex: new RegExp(location, "i") }; // case-insensitive
            }

            const allListings = await Listing.find(filter);

            res.render("listings", {
                allListings,
                selectedCategory: category || "all",
                searchLocation: location || ""
            });
        } catch (e) {
            console.error("Error fetching listings:", e);
            res.status(500).send("Server Error");
        }
    


}

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({
        path: "reviews", populate: {
            path: "author",
        }
    }).populate("owner");
    console.log(listing);
    if (!listing) {
        req.flash("error", "Listing u requested for does not exist");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
}


module.exports.createListing = async (req, res, next) => {

    //console.log(req.body);
    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
    }).send()

    let url = req.file.path;
    let filename = req.file.filename;

    const newLisiting = new Listing(req.body.listing);
    newLisiting.owner = req.user._id;
    newLisiting.image = { url, filename };
    newLisiting.geometry = response.body.features[0].geometry;


    console.log(response.body.features[0].geometry);
    let savedListing = await newLisiting.save();
    console.log(savedListing);
    req.flash("success", "new listing created");
    res.redirect("/listings");

}

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing u requested for does not exist");
        res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl.replace("/upload", "/upload/h_300,w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });

}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "listing updated");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "listing Deleted");
    res.redirect("/listings");
}