const axios = require("axios");
const bodyParser = require('body-parser')

module.exports = (app) =>{
    app.use(bodyParser.text())
    app.post("/api/callback", async (req,res) => {
        axios.post(process.env.CALL_BACK_API_URL,req.body,{
            headers : {
                'Content-Type': 'text/plain',
                Authorization: `Basic ${process.env.CALL_BACK_API_KEY}`
            }})
            .then(() => res.status(200).send({
                    response_code: 200,
                    response_reason: "Successful"
                }))
            .catch(error => {
                if (!error.response.data.message) {
                    return res.status(500).send({
                        message : "Internal server error",
                        response_code: 500,
                        response_reason: "fail"
                    })
                }
                return res.status(error.response.status).send({
                    message : error.response.data.message,
                    response_code: error.response.status,
                    response_reason: "fail"
                })
            })
    })
}