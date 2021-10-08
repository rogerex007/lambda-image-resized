const AWS = require('aws-sdk');

s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const uuid = require('uuid');

const sharp = require('sharp');

let response;

exports.lambdaHandler = async (event, context) => {
    try {
        const method = event.httpMethod.toLowerCase();
        console.log('METHOD VARIABLE:  ' + method);
        switch (method) {
            case 'post':
                const { imageBinary } = getParams(event);
                console.log("IMG: " + imageBinary);
                const success = await saveBucketImage(imageBinary);
                response = {
                    'statusCode': 200,
                    'body': JSON.stringify({
                        message: success

                    })
                }
                break;
            case 'get':
                response = {
                    'statusCode': 200,
                    'body': JSON.stringify({
                        message: 'IMAGE: {example}'

                    })
                }
                break;
            default:
                response = {
                    'statusCode': 502,
                    'body': JSON.stringify({
                        message: 'Error'

                    })
                }
                break;
        }
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};

const getParams = (event) => {
    return JSON.parse(event.body);
};

const saveBucketImage = async (imageData) => {

    let imageName = `${uuid.v4()}.jpg`
    return new Promise((resolve, reject) => {
        buf = new Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        buf_thumbnail = new Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64')
        var data = {
            Key: imageName,
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg',
            ACL: 'public-read',
            Bucket: process.env.UPLOAD_BUCKET_NAME
        };
 
        s3.putObject(data, function (err, data) {
            if (err) {
                console.log('Error uploading image', err);
                reject(err)
            } else {
                console.log('succesfully uploaded the image!: ', data);
                resolve(createFullUrl(process.env.UPLOAD_BUCKET_NAME, 'us-east-2', imageName))
                .then(async (success) => {
                    const smallImg = await sharp(buf_thumbnail)
                    .resize({ width: 200 })
                    .toBuffer();
                    var dataTB = {
                        Key: imageName,
                        Body: smallImg,
                        ContentEncoding: 'base64',
                        ContentType: 'image/jpeg',
                        ACL: 'public-read',
                        Bucket: process.env.THUMBNAIL_BUCKET
                    };
                    s3.putObject(dataTB, function (err, data) {
                        if (err) {
                            console.log('Error uploading thumbnailImage', err);
                            reject(err);
                        }else{
                            console.log('succesfully uploaded the thumbnailImage!: ', data);
                        }
                    })
                })
            }
        })
    });
};
const createFullUrl = (bucketName, region, imageName) => {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${imageName}`;
};