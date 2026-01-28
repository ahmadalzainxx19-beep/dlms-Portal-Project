# دليل Backend API - .NET Core 9

## نظرة عامة

Backend API هو مشروع .NET Core 9 Web API منفصل يتحمل مسؤولية:
- ✅ **جميع استدعاءات Blackboard API**
- ✅ **جميع استدعاءات QuestionMark API**
- ✅ **جميع استدعاءات Banner API**
- ✅ **التعامل مع قاعدة البيانات SQL Server**
- ✅ **توفير RESTful API للـ Frontend**

### المعمارية:

```
Backend API (.NET Core 9)
    ↓ HTTP Requests
Blackboard API / QuestionMark API / Banner API
    ↓
SQL Server (Database)
```

---

## 1. إعداد المشروع

### إنشاء المشروع:

```bash
dotnet new webapi -n StudentDashboard.Api -f net9.0
cd StudentDashboard.Api
```

### إضافة الحزم المطلوبة:

```bash
# Entity Framework Core
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools

# HTTP Client Policies
dotnet add package Microsoft.Extensions.Http.Polly

# Authentication
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer

# Swagger
dotnet add package Swashbuckle.AspNetCore
```

---

## 2. التكامل مع Blackboard API

### BlackboardApiService.cs

```csharp
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace StudentDashboard.Api.Services
{
    public class BlackboardApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private string _accessToken;

        public BlackboardApiService(
            HttpClient httpClient, 
            IConfiguration configuration,
            IMemoryCache cache)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _cache = cache;
            _httpClient.BaseAddress = new Uri(_configuration["Blackboard:BaseUrl"]);
        }

        // المصادقة والحصول على Access Token
        public async Task<string> AuthenticateAsync()
        {
            const string cacheKey = "blackboard_access_token";
            
            // التحقق من Cache
            if (_cache.TryGetValue(cacheKey, out string cachedToken))
            {
                _accessToken = cachedToken;
                return cachedToken;
            }

            var tokenUrl = "/learn/api/public/v1/oauth2/token";
            var clientId = _configuration["Blackboard:ClientId"];
            var clientSecret = _configuration["Blackboard:ClientSecret"];

            var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic", 
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"))
            );
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials")
            });

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var tokenData = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
            _accessToken = tokenData.GetProperty("access_token").GetString();
            
            // حفظ في Cache لمدة 55 دقيقة
            _cache.Set(cacheKey, _accessToken, TimeSpan.FromMinutes(55));
            
            return _accessToken;
        }

        // جلب محتوى المقرر
        public async Task<List<ContentItem>> GetCourseContentsAsync(string courseId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"/learn/api/public/v1/courses/{courseId}/contents";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<BlackboardApiResponse<ContentItem>>(jsonResponse);
            
            return result.Results;
        }

        // حساب نسبة مشاهدة المحتوى
        public async Task<double> CalculateContentViewsPercentageAsync(string courseId, string userId)
        {
            var contents = await GetCourseContentsAsync(courseId);
            int reviewedCount = 0;

            foreach (var content in contents)
            {
                var userContentUrl = $"/learn/api/public/v1/courses/{courseId}/contents/{content.Id}/users/{userId}";
                var request = new HttpRequestMessage(HttpMethod.Get, userContentUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    var userContent = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                    
                    if (userContent.TryGetProperty("reviewed", out var reviewed) && 
                        reviewed.GetBoolean())
                    {
                        reviewedCount++;
                    }
                }
            }

            return contents.Count > 0 ? (reviewedCount / (double)contents.Count) * 100 : 0;
        }

        // جلب الواجبات
        public async Task<List<GradebookColumn>> GetAssignmentsAsync(string courseId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"/learn/api/public/v1/courses/{courseId}/gradebook/columns";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<BlackboardApiResponse<GradebookColumn>>(jsonResponse);
            
            // تصفية الواجبات فقط
            return result.Results.Where(c => c.Grading.Type == "Attempt").ToList();
        }

        // حساب نسبة تسليم الواجبات
        public async Task<double> CalculateAssignmentSubmissionPercentageAsync(string courseId, string userId)
        {
            var assignments = await GetAssignmentsAsync(courseId);
            int submittedCount = 0;

            foreach (var assignment in assignments)
            {
                var attemptsUrl = $"/learn/api/public/v1/courses/{courseId}/gradebook/columns/{assignment.Id}/attempts";
                var request = new HttpRequestMessage(HttpMethod.Get, attemptsUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    var attempts = JsonSerializer.Deserialize<BlackboardApiResponse<Attempt>>(jsonResponse);
                    
                    if (attempts.Results.Any(a => a.UserId == userId))
                    {
                        submittedCount++;
                    }
                }
            }

            return assignments.Count > 0 ? (submittedCount / (double)assignments.Count) * 100 : 0;
        }

        // جلب محاولات الواجب
        public async Task<List<Attempt>> GetAssignmentAttemptsAsync(string courseId, string columnId, string userId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"/learn/api/public/v1/courses/{courseId}/gradebook/columns/{columnId}/attempts";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<BlackboardApiResponse<Attempt>>(jsonResponse);
            
            return result.Results.Where(a => a.UserId == userId).ToList();
        }

        // حساب نسبة المشاركة في المنتديات
        public async Task<double> CalculateForumParticipationPercentageAsync(string courseId, string userId)
        {
            await EnsureAuthenticatedAsync();
            
            var forumsUrl = $"/learn/api/public/v1/courses/{courseId}/discussions/forums";
            var request = new HttpRequestMessage(HttpMethod.Get, forumsUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var forums = JsonSerializer.Deserialize<BlackboardApiResponse<Forum>>(jsonResponse);
            
            int participatedForums = 0;

            foreach (var forum in forums.Results)
            {
                var postsUrl = $"/learn/api/public/v1/courses/{courseId}/discussions/forums/{forum.Id}/posts";
                var postsRequest = new HttpRequestMessage(HttpMethod.Get, postsUrl);
                postsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

                var postsResponse = await _httpClient.SendAsync(postsRequest);
                if (postsResponse.IsSuccessStatusCode)
                {
                    var postsJson = await postsResponse.Content.ReadAsStringAsync();
                    var posts = JsonSerializer.Deserialize<BlackboardApiResponse<Post>>(postsJson);
                    
                    if (posts.Results.Any(p => p.AuthorId == userId))
                    {
                        participatedForums++;
                    }
                }
            }

            return forums.Results.Count > 0 ? (participatedForums / (double)forums.Results.Count) * 100 : 0;
        }

        // جلب إحصائيات النشاط
        public async Task<ActivityStats> GetActivityStatsAsync(string courseId, string userId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"/learn/api/public/v1/courses/{courseId}/analytics/users/{userId}/activity";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var activity = JsonSerializer.Deserialize<ActivityStats>(jsonResponse);
            
            return activity;
        }

        private async Task EnsureAuthenticatedAsync()
        {
            if (string.IsNullOrEmpty(_accessToken))
            {
                await AuthenticateAsync();
            }
        }
    }
}
```

### Models

```csharp
// Models/Blackboard/ContentItem.cs
namespace StudentDashboard.Api.Models.Blackboard
{
    public class ContentItem
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public ContentHandler ContentHandler { get; set; }
    }

    public class ContentHandler
    {
        public string Id { get; set; }
    }

    public class GradebookColumn
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public DateTime? DueDate { get; set; }
        public GradingInfo Grading { get; set; }
        public decimal? MaxScore { get; set; }
    }

    public class GradingInfo
    {
        public string Type { get; set; }
    }

    public class Attempt
    {
        public string UserId { get; set; }
        public string Status { get; set; }
        public decimal? Score { get; set; }
    }

    public class Forum
    {
        public string Id { get; set; }
        public string Title { get; set; }
    }

    public class Post
    {
        public string Id { get; set; }
        public string AuthorId { get; set; }
        public string Text { get; set; }
    }

    public class ActivityStats
    {
        public int AccessCount { get; set; }
        public long TimeSpent { get; set; } // بالثواني
    }

    public class BlackboardApiResponse<T>
    {
        public List<T> Results { get; set; }
    }
}
```

---

## 3. Controllers

### BlackboardController.cs

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentDashboard.Api.Services;
using StudentDashboard.Api.Data.Repositories;
using StudentDashboard.Api.Models.DTOs;

namespace StudentDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BlackboardController : ControllerBase
    {
        private readonly BlackboardApiService _blackboardService;
        private readonly IStudentDataRepository _repository;
        private readonly ILogger<BlackboardController> _logger;

        public BlackboardController(
            BlackboardApiService blackboardService,
            IStudentDataRepository repository,
            ILogger<BlackboardController> logger)
        {
            _blackboardService = blackboardService;
            _repository = repository;
            _logger = logger;
        }

        // GET: api/blackboard/courses/{courseId}/engagement
        [HttpGet("courses/{courseId}/engagement")]
        public async Task<IActionResult> GetCourseEngagement(string courseId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // محاولة جلب البيانات من قاعدة البيانات أولاً
                var cachedEngagement = await _repository.GetEngagementAsync(userId, courseId);
                
                // إذا كانت البيانات حديثة (أقل من ساعة)، استخدمها
                if (cachedEngagement != null && 
                    cachedEngagement.LastUpdated > DateTime.UtcNow.AddHours(-1))
                {
                    return Ok(new EngagementResponseDto
                    {
                        ContentViewsPercentage = cachedEngagement.ContentViewsPercentage,
                        AssignmentSubmissionPercentage = cachedEngagement.AssignmentSubmissionPercentage,
                        ForumParticipationPercentage = cachedEngagement.ForumParticipationPercentage,
                        AccessCount = cachedEngagement.AccessCount,
                        TotalHours = cachedEngagement.TotalHours,
                        LastUpdated = cachedEngagement.LastUpdated
                    });
                }

                // جلب البيانات من Blackboard API
                var contentViews = await _blackboardService
                    .CalculateContentViewsPercentageAsync(courseId, userId);
                var assignments = await _blackboardService
                    .CalculateAssignmentSubmissionPercentageAsync(courseId, userId);
                var forums = await _blackboardService
                    .CalculateForumParticipationPercentageAsync(courseId, userId);
                var activityStats = await _blackboardService
                    .GetActivityStatsAsync(courseId, userId);

                var engagementData = new EngagementResponseDto
                {
                    ContentViewsPercentage = Math.Round(contentViews, 2),
                    AssignmentSubmissionPercentage = Math.Round(assignments, 2),
                    ForumParticipationPercentage = Math.Round(forums, 2),
                    AccessCount = activityStats.AccessCount,
                    TotalHours = TimeSpan.FromSeconds(activityStats.TimeSpent).TotalHours,
                    LastUpdated = DateTime.UtcNow
                };

                // حفظ البيانات في قاعدة البيانات
                await _repository.SaveEngagementDataAsync(userId, courseId, engagementData);

                return Ok(engagementData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching engagement data for course {CourseId}", courseId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET: api/blackboard/courses/{courseId}/assignments
        [HttpGet("courses/{courseId}/assignments")]
        public async Task<IActionResult> GetCourseAssignments(string courseId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // جلب الواجبات من Blackboard API
                var assignments = await _blackboardService.GetAssignmentsAsync(courseId);
                
                // جلب محاولات الطالب لكل واجب
                var assignmentsWithStatus = new List<AssignmentDto>();
                foreach (var assignment in assignments)
                {
                    var attempts = await _blackboardService
                        .GetAssignmentAttemptsAsync(courseId, assignment.Id, userId);
                    
                    assignmentsWithStatus.Add(new AssignmentDto
                    {
                        Id = assignment.Id,
                        Name = assignment.Name,
                        DueDate = assignment.DueDate,
                        Status = attempts.Any() ? "Completed" : "Pending",
                        Grade = attempts.FirstOrDefault()?.Score,
                        MaxGrade = assignment.MaxScore
                    });
                }

                return Ok(assignmentsWithStatus);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching assignments for course {CourseId}", courseId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET: api/blackboard/dashboard/overview
        [HttpGet("dashboard/overview")]
        public async Task<IActionResult> GetDashboardOverview()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // جلب إحصائيات شاملة من قاعدة البيانات
                var overview = await _repository.GetOverallEngagementAsync(userId);
                
                return Ok(overview);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching dashboard overview");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}
```

### DTOs

```csharp
// Models/DTOs/EngagementResponseDto.cs
namespace StudentDashboard.Api.Models.DTOs
{
    public class EngagementResponseDto
    {
        public double ContentViewsPercentage { get; set; }
        public double AssignmentSubmissionPercentage { get; set; }
        public double ForumParticipationPercentage { get; set; }
        public int AccessCount { get; set; }
        public double TotalHours { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class AssignmentDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public DateTime? DueDate { get; set; }
        public string Status { get; set; }
        public decimal? Grade { get; set; }
        public decimal? MaxGrade { get; set; }
    }
}
```

---

## 4. قاعدة البيانات

### ApplicationDbContext.cs

```csharp
using Microsoft.EntityFrameworkCore;
using StudentDashboard.Api.Models.Entities;

namespace StudentDashboard.Api.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<StudentEngagement> StudentEngagements { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<StudentEngagement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.StudentId, e.CourseId }).IsUnique();
            });
        }
    }
}
```

### StudentEngagement.cs

```csharp
namespace StudentDashboard.Api.Models.Entities
{
    public class StudentEngagement
    {
        public int Id { get; set; }
        public string StudentId { get; set; }
        public string CourseId { get; set; }
        public double ContentViewsPercentage { get; set; }
        public double AssignmentSubmissionPercentage { get; set; }
        public double ForumParticipationPercentage { get; set; }
        public int AccessCount { get; set; }
        public double TotalHours { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}
```

### Repository

```csharp
// Data/Repositories/IStudentDataRepository.cs
namespace StudentDashboard.Api.Data.Repositories
{
    public interface IStudentDataRepository
    {
        Task<StudentEngagement> GetEngagementAsync(string studentId, string courseId);
        Task SaveEngagementDataAsync(string studentId, string courseId, EngagementResponseDto data);
        Task<DashboardOverviewDto> GetOverallEngagementAsync(string studentId);
    }
}

// Data/Repositories/StudentDataRepository.cs
using Microsoft.EntityFrameworkCore;
using StudentDashboard.Api.Data;
using StudentDashboard.Api.Models.DTOs;
using StudentDashboard.Api.Models.Entities;

namespace StudentDashboard.Api.Data.Repositories
{
    public class StudentDataRepository : IStudentDataRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentDataRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<StudentEngagement> GetEngagementAsync(string studentId, string courseId)
        {
            return await _context.StudentEngagements
                .FirstOrDefaultAsync(e => 
                    e.StudentId == studentId && 
                    e.CourseId == courseId);
        }

        public async Task SaveEngagementDataAsync(string studentId, string courseId, EngagementResponseDto data)
        {
            var engagement = await GetEngagementAsync(studentId, courseId);
            
            if (engagement == null)
            {
                engagement = new StudentEngagement
                {
                    StudentId = studentId,
                    CourseId = courseId
                };
                _context.StudentEngagements.Add(engagement);
            }

            engagement.ContentViewsPercentage = data.ContentViewsPercentage;
            engagement.AssignmentSubmissionPercentage = data.AssignmentSubmissionPercentage;
            engagement.ForumParticipationPercentage = data.ForumParticipationPercentage;
            engagement.AccessCount = data.AccessCount;
            engagement.TotalHours = data.TotalHours;
            engagement.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<DashboardOverviewDto> GetOverallEngagementAsync(string studentId)
        {
            var engagements = await _context.StudentEngagements
                .Where(e => e.StudentId == studentId)
                .ToListAsync();

            if (!engagements.Any())
            {
                return new DashboardOverviewDto();
            }

            return new DashboardOverviewDto
            {
                TotalLogins = engagements.Sum(e => e.AccessCount),
                TotalHours = engagements.Sum(e => e.TotalHours),
                AverageProgress = engagements.Average(e => 
                    (e.ContentViewsPercentage + e.AssignmentSubmissionPercentage) / 2),
                CompletedAssignments = engagements.Count(e => e.AssignmentSubmissionPercentage > 0),
                TotalAssignments = engagements.Count()
            };
        }
    }
}
```

---

## 5. Program.cs

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StudentDashboard.Api.Data;
using StudentDashboard.Api.Data.Repositories;
using StudentDashboard.Api.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Memory Cache
builder.Services.AddMemoryCache();

// HTTP Clients للاتصال بـ External APIs
builder.Services.AddHttpClient<BlackboardApiService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Blackboard:BaseUrl"]);
    client.Timeout = TimeSpan.FromSeconds(30);
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());

// Services
builder.Services.AddScoped<BlackboardApiService>();
builder.Services.AddScoped<IStudentDataRepository, StudentDataRepository>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Identity:Authority"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = true,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

// API Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(builder.Configuration["Frontend:BaseUrl"])
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
}
```

---

## 6. appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=StudentDashboard;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Blackboard": {
    "BaseUrl": "https://your-blackboard-instance.learn.com",
    "ClientId": "",
    "ClientSecret": ""
  },
  "Identity": {
    "Authority": "https://your-identity-server.com"
  },
  "Frontend": {
    "BaseUrl": "https://your-frontend-domain.com"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

---

## 7. User Secrets (للبيئة المحلية)

```bash
dotnet user-secrets set "Blackboard:ClientId" "your-client-id"
dotnet user-secrets set "Blackboard:ClientSecret" "your-client-secret"
```

---

## 8. Background Service (اختياري)

```csharp
// BackgroundServices/DataSyncService.cs
namespace StudentDashboard.Api.BackgroundServices
{
    public class DataSyncService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DataSyncService> _logger;

        public DataSyncService(
            IServiceProvider serviceProvider,
            ILogger<DataSyncService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var blackboardService = scope.ServiceProvider
                        .GetRequiredService<BlackboardApiService>();
                    var repository = scope.ServiceProvider
                        .GetRequiredService<IStudentDataRepository>();

                    // تحديث بيانات Blackboard كل 24 ساعة
                    await SyncBlackboardDataAsync(blackboardService, repository);
                    
                    // انتظار 24 ساعة
                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in data sync service");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }
        }

        private async Task SyncBlackboardDataAsync(
            BlackboardApiService blackboardService,
            IStudentDataRepository repository)
        {
            // جلب جميع الطلاب النشطين وتحديث بياناتهم
            // ...
        }
    }
}
```

---

## 9. قائمة التحقق

- [ ] إنشاء المشروع
- [ ] إضافة الحزم المطلوبة
- [ ] إعداد قاعدة البيانات
- [ ] إنشاء BlackboardApiService
- [ ] إنشاء Controllers
- [ ] إعداد Authentication
- [ ] إعداد CORS
- [ ] إضافة User Secrets
- [ ] اختبار API Endpoints
- [ ] إضافة Swagger Documentation

---

**آخر تحديث**: يناير 2026  
**الإصدار**: .NET Core 9
