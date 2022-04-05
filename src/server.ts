import express from 'express';

const app = express();


app.use(express.json());

app.get("/", (_, res) => {
  res.end("FOO")
})


app.listen(3000, () => {
  console.log("Listening on port 3000")
});