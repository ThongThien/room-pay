using Amazon.S3;
using Amazon.S3.Transfer;

namespace ReadingService.Services;

public class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3Service(IAmazonS3 s3Client, IConfiguration configuration)
    {
        _s3Client = s3Client;
        _bucketName = configuration["AWS:BucketName"] 
            ?? throw new ArgumentNullException(nameof(configuration), "AWS:BucketName not configured");
    }

    public async Task<string> UploadFileAsync(IFormFile file, string folder)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty");

        var fileName = $"{folder}/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

        using var stream = file.OpenReadStream();
        
        var uploadRequest = new TransferUtilityUploadRequest
        {
            InputStream = stream,
            Key = fileName,
            BucketName = _bucketName,
            ContentType = file.ContentType
            // CannedACL = S3CannedACL.PublicRead // Bỏ ACL vì bucket không cho phép
        };

        var transferUtility = new TransferUtility(_s3Client);
        await transferUtility.UploadAsync(uploadRequest);

        // Return the URL of the uploaded file
        return $"https://{_bucketName}.s3.amazonaws.com/{fileName}";
    }

    public async Task<bool> DeleteFileAsync(string fileUrl)
    {
        try
        {
            var uri = new Uri(fileUrl);
            var key = uri.AbsolutePath.TrimStart('/');

            await _s3Client.DeleteObjectAsync(_bucketName, key);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

