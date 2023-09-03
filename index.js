import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import mongoose from "mongoose";
import _ from "lodash";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
const PORT = process.env.PORT || 3000;


main();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error("Function encountered an error:", error);
  }
}

const listSchema = new mongoose.Schema({ name: String });
const List = mongoose.model("List", listSchema);

const defaultItems = [
  new List({ name: "Type in the New Item" }),
  new List({ name: "Hit the Plus(+) button" }),
];

const routeSchema = new mongoose.Schema({
  routeTitle: String,
  routeLists: [listSchema],
});

const Route = mongoose.model("Route", routeSchema);

app.get("/", async (req, res) => {
  try {
    const result = await List.find({});
    if (result.length === 0) {
      await List.insertMany(defaultItems);
    }
    res.render("list.ejs", { routeTitle: "Today", routeLists: result });
  } catch (error) {
    console.error(error.message);
  }
});

app.get("/:userId", async (req, res) => {
  const route = _.startCase(req.params.userId);
  const resultFound = await Route.findOne({ routeTitle: route });
  if (!resultFound) {
    const dynamicRoute = new Route({
      routeTitle: route,
      routeLists: defaultItems,
    });
    await dynamicRoute.save();
  }
  res.render("list.ejs", {
    routeTitle: route,
    routeLists: resultFound ? resultFound.routeLists : [],
  });
});

app.post("/", (req, res) => {
  const item = req.body.newItem;
  const postedRoute = req.body.buttonRoute;
  const listItem = new List({ name: item });

  if (postedRoute === "Today") {
    listItem.save();
  } else {
    Route.findOne({ routeTitle: postedRoute }).then((result) => {
      if (result) {
        result.routeLists.push(listItem);
        result.save();
      }
    });
  }
  res.redirect(postedRoute === "Today" ? "/" : "/" + postedRoute);
});

app.post("/delete", async (req, res) => {
  const checkItem = req.body.checkbox;
  const routeName = req.body.routeName;

  if (routeName === "Today") {
    await List.findByIdAndRemove(checkItem);
  } else {
    const updatedRoute = await Route.findOneAndUpdate(
      { routeTitle: routeName },
      { $pull: { routeLists: { _id: checkItem } } }
    );
  }
  res.redirect(routeName === "Today" ? "/" : "/" + routeName);
});

app.listen(3000, () => {
  console.log(`Server started on port ${PORT}`);
});
