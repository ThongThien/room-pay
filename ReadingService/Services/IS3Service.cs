namespace ReadingService.Services;

public interface IS3Service
{
    Task<string> UploadFileAsync(IFormFile file, string folder);
    Task<bool> DeleteFileAsync(string fileUrl);
}

