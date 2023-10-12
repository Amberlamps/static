import sharp, { ResizeOptions } from "sharp";
import { S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable, Stream } from "stream";
import { Upload } from "@aws-sdk/lib-storage";

const bucketName = process.env["BUCKET_NAME"];
if (!bucketName) {
    throw new Error("Bucket name not set");
}

const sizes = process.env["IMAGE_SIZES"];
if (!sizes) {
    throw new Error("Sizes not set");
}

const fits = process.env["IMAGE_FITS"] || "contain";
const qualities = process.env["IMAGE_QUALITY"] || "100";

const resizeImage = async (key: string): Promise<void> => {
    const client = new S3Client();
    const [uploadId] = key.split("/");
    if (uploadId) {
        const getItem = await client.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            }),
        );

        const image = getItem.Body as Readable;
        const combinations = sizes
            .split(",")
            .flatMap((size) =>
                fits
                    .split(",")
                    .flatMap((fit) =>
                        qualities
                            .split(",")
                            .flatMap((quality) =>
                                ["normal", "grey"].map((type) => [
                                    size,
                                    fit,
                                    quality,
                                    type,
                                ]),
                            ),
                    ),
            ) as Array<[string, string, string, "normal" | "grey"]>;

        await Promise.all(
            combinations.map(async (combination) => {
                const [size, fit, quality, type] = combination;
                const [widthStr, heightStr] = size.split("x");
                if (widthStr && heightStr) {
                    const width = parseInt(widthStr);
                    const height = parseInt(heightStr);
                    if (type === "normal") {
                        const passThrough1 = new Stream.PassThrough();
                        image
                            .pipe(
                                sharp()
                                    .resize(width, height, {
                                        fit: fit as ResizeOptions["fit"],
                                        background: {
                                            r: 255,
                                            g: 255,
                                            b: 255,
                                            alpha: 0,
                                        },
                                    })
                                    .png({
                                        quality: parseInt(quality),
                                    }),
                            )
                            .pipe(passThrough1);
                        const upload1 = new Upload({
                            client,
                            params: {
                                Bucket: bucketName,
                                Key: `${uploadId}/${size}-${fit}-${quality}.png`,
                                Body: passThrough1,
                                ContentType: "image/png",
                            },
                        });
                        await upload1.done();
                    } else if (type === "grey") {
                        const passThrough2 = new Stream.PassThrough();
                        image
                            .pipe(
                                sharp()
                                    .resize(width, height, {
                                        fit: fit as ResizeOptions["fit"],
                                        background: {
                                            r: 255,
                                            g: 255,
                                            b: 255,
                                            alpha: 0,
                                        },
                                    })
                                    .png({
                                        quality: parseInt(quality),
                                    })
                                    .greyscale(),
                            )
                            .pipe(passThrough2);
                        const upload2 = new Upload({
                            client,
                            params: {
                                Bucket: bucketName,
                                Key: `${uploadId}/${size}-${fit}-${quality}-grey.png`,
                                Body: passThrough2,
                                ContentType: "image/png",
                            },
                        });
                        await upload2.done();
                    }
                }
            }),
        );
    }
};

export const handler: S3Handler = async (event) => {
    const keys = event.Records.map((record) => record.s3.object.key);
    await Promise.all(keys.map(resizeImage));
};
