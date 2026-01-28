# دليل التكامل مع APIs

## نظرة عامة

هذا النظام يتكامل مع ثلاثة أنظمة رئيسية:

1. **Blackboard Learn API** - لإدارة المحتوى التعليمي والتفاعل
2. **QuestionMark OData API** - لإدارة الاختبارات والنتائج
3. **Banner System** - للنظام الأكاديمي والتسجيل

### المعمارية (Architecture):

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │         │  External APIs  │
│                 │         │                 │         │                 │
│ .NET Core 9 MVC │ ──────> │ .NET Core 9 API │ ──────> │  Blackboard API │
│                 │  HTTP   │                 │  HTTP   │  QuestionMark   │
│  (Views/Razor)  │         │  (Controllers)  │         │  Banner API      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │   SQL Server    │
                              │   (Database)    │
                              └─────────────────┘
```

### التقنيات المستخدمة:
- **Backend API**: .NET Core 9 Web API (C#)
- **Frontend**: .NET Core 9 MVC (C#)
- **قاعدة البيانات**: SQL Server
- **نظام التشغيل**: Windows أو Linux

### مبدأ التصميم:
- ✅ **جميع استدعاءات Blackboard API تتم من Backend فقط**
- ✅ Frontend يتصل بـ Backend API فقط
- ✅ Backend API هو الوحيد الذي يتصل بـ External APIs
- ✅ البيانات المخزنة في SQL Server يتم الوصول إليها من Backend

---

## 1. Blackboard Learn API

### المصدر
- **Swagger Documentation**: [https://developer.anthology.com/portal/displayApi](https://developer.anthology.com/portal/displayApi)
- **Latest Supported Version**: 4000.9.0
- **Authentication**: OAuth 2.0 (Client Credentials Flow)

### الاستخدام في النظام

#### البيانات المستخرجة من Blackboard:

1. **الواجبات (Assignments)**
   - عدد الواجبات الكلي
   - عدد الواجبات المحلولة
   - عدد الواجبات المتبقية
   - تفاصيل كل واجب (اسم، تاريخ التسليم، الحالة، الدرجة)
   - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/gradebook/columns`
   - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/gradebook/columns/{columnId}/attempts`

2. **التفاعل والاستخدام (Engagement)**
   - عدد مرات الدخول إلى النظام (`accessCount`)
   - الوقت الكلي الذي قضاه الطالب (`timeSpent` بالثواني)
   - تفصيل حسب التاريخ
   - **نسبة مشاهدة المحتوى (Content Views)**: 92%
     - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/contents`
     - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/contents/{contentId}/users/{userId}`
     - **الحساب**: (عدد المحتويات التي `reviewed: true` ÷ العدد الكلي) × 100
   - **نسبة تسليم الواجبات (Assignment Submission)**: 83%
     - **الحساب**: (عدد الواجبات المسلمة ÷ إجمالي الواجبات) × 100
   - **المشاركة في المنتديات (Forum Participation)**: 45%
     - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/discussions/forums`
     - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/discussions/forums/{forumId}/posts`
     - **الحساب**: (منتديات شارك فيها الطالب ÷ إجمالي المنتديات) × 100
   - **إحصائيات النشاط**:
     - **Endpoint**: `GET /learn/api/public/v1/courses/{courseId}/analytics/users/{userId}/activity`

3. **المحاضرات والحضور**
   - المحاضرات المجدولة
   - تقرير الحضور والغياب
   - عرض الحضور بشكل زمني أو نسبي

### مثال على التكامل (.NET Core)

```csharp
// Service: BlackboardApiService.cs
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

public class BlackboardApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private string _accessToken;

    public BlackboardApiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _httpClient.BaseAddress = new Uri(_configuration["Blackboard:BaseUrl"]);
    }

    // المصادقة والحصول على Access Token
    public async Task<string> AuthenticateAsync()
    {
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

// Models
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
    public GradingInfo Grading { get; set; }
}

public class GradingInfo
{
    public string Type { get; set; }
}

public class Attempt
{
    public string UserId { get; set; }
    public string Status { get; set; }
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
```

### Backend API Controller Example

```csharp
// Backend API Project
// Controllers/BlackboardController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BlackboardController : ControllerBase
{
    private readonly BlackboardApiService _blackboardService;
    private readonly IStudentDataRepository _repository;

    public BlackboardController(
        BlackboardApiService blackboardService,
        IStudentDataRepository repository)
    {
        _blackboardService = blackboardService;
        _repository = repository;
    }

    // GET: api/blackboard/courses/{courseId}/engagement
    [HttpGet("courses/{courseId}/engagement")]
    public async Task<IActionResult> GetCourseEngagement(string courseId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
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

        // جلب البيانات من Blackboard API (يتم من Backend فقط)
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

    // GET: api/blackboard/courses/{courseId}/assignments
    [HttpGet("courses/{courseId}/assignments")]
    public async Task<IActionResult> GetCourseAssignments(string courseId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // جلب الواجبات من Blackboard API (من Backend فقط)
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
}

// DTOs
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
```

---

## 2. QuestionMark OData API

### المصدر
- **Documentation**: [https://questionmark.github.io/qm-oap-docs/authoringodata/intro.html](https://questionmark.github.io/qm-oap-docs/authoringodata/intro.html)
- **Protocol**: OData v4
- **Authentication**: HTTP Basic Authentication

### Service Root

للمستخدمين في Questionmark OnDemand:
```
https://ondemand.questionmark.com/authoringapi/<customer ID>/odata/
```

أو للعملاء في أوروبا:
```
https://ondemand.questionmark.eu/authoringapi/<customer ID>/odata/
```

### الاستخدام في النظام

#### البيانات المستخرجة من QuestionMark:

1. **الاختبارات المجدولة**
   - اسم الاختبار
   - تاريخ ووقت الاختبار
   - القاعة أو الموقع الجغرافي (للاختبارات الحضورية)
   - **Endpoint**: `GET /Assessments?$filter=ScheduledDateTime ge {date}`

2. **النتائج والتحليل**
   - نتائج الطالب في الاختبارات
   - مقارنة نتائج الطالب مع مستواه ضمن الشعبة
   - ربط نتائج الاختبارات بمستوى التفاعل التعليمي
   - **Endpoint**: `GET /Results?$filter=StudentId eq {studentId}`

3. **الدعم الفني**
   - إمكانية إرسال مشكلة أو طلب دعم مرتبط باختبار معين

### مثال على التكامل (.NET Core)

```csharp
// Service: QuestionMarkApiService.cs
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class QuestionMarkApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly string _serviceRoot;

    public QuestionMarkApiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        var customerId = _configuration["QuestionMark:CustomerId"];
        _serviceRoot = $"https://ondemand.questionmark.com/authoringapi/{customerId}/odata/";
        
        // إعداد HTTP Basic Authentication
        var username = _configuration["QuestionMark:Username"];
        var password = _configuration["QuestionMark:Password"];
        var authValue = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{username}:{password}"));
        _httpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Basic", authValue);
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // جلب الاختبارات المجدولة
    public async Task<List<Assessment>> GetScheduledAssessmentsAsync(DateTime? fromDate = null)
    {
        var url = $"{_serviceRoot}Assessments";
        
        if (fromDate.HasValue)
        {
            var filterDate = fromDate.Value.ToString("yyyy-MM-ddTHH:mm:ssZ");
            url += $"?$filter=ScheduledDateTime ge {filterDate}";
        }

        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ODataResponse<Assessment>>(jsonResponse);
        
        return result.Value;
    }

    // جلب نتائج الطالب
    public async Task<List<Result>> GetStudentResultsAsync(string studentId)
    {
        var url = $"{_serviceRoot}Results?$filter=StudentId eq '{studentId}'&$orderby=CompletedDateTime desc";
        
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ODataResponse<Result>>(jsonResponse);
        
        return result.Value;
    }

    // جلب تفاصيل اختبار معين
    public async Task<Assessment> GetAssessmentDetailsAsync(string assessmentId)
    {
        var url = $"{_serviceRoot}Assessments('{assessmentId}')";
        
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var assessment = JsonSerializer.Deserialize<Assessment>(jsonResponse);
        
        return assessment;
    }
}

// Models
public class Assessment
{
    public string Id { get; set; }
    public string Title { get; set; }
    public DateTime? ScheduledDateTime { get; set; }
    public string Location { get; set; }
    public int Duration { get; set; } // بالدقائق
}

public class Result
{
    public string Id { get; set; }
    public string StudentId { get; set; }
    public string AssessmentId { get; set; }
    public DateTime? CompletedDateTime { get; set; }
    public decimal? Score { get; set; }
    public decimal? MaxScore { get; set; }
    public string Status { get; set; }
}

public class ODataResponse<T>
{
    [JsonPropertyName("@odata.context")]
    public string Context { get; set; }
    
    [JsonPropertyName("value")]
    public List<T> Value { get; set; }
}
```

### OData Features المدعومة

- **$top** و **$skip**: للتحكم في عدد النتائج
- **$filter**: للتصفية حسب معايير محددة
- **$orderby**: لترتيب النتائج
- **$expand**: لتوسيع الخصائص المرتبطة
- **$count**: للحصول على عدد السجلات

### مثال على استخدام $filter في C#

```csharp
// جلب الاختبارات المجدولة في تاريخ محدد
var filterDate = DateTime.Now.AddDays(7); // الأسبوع القادم
var assessments = await _questionMarkService
    .GetScheduledAssessmentsAsync(filterDate);
```

---

## 3. التكامل مع النظام الأكاديمي (Banner)

### البيانات المستخرجة:

- بيانات التسجيل
- الجداول الدراسية
- الشعب الدراسية
- معلومات المقررات
- بيانات الطالب الشخصية والأكاديمية

### ملاحظة
يتم جلب بيانات المقررات مباشرة من النظام الأكاديمي (Banner) عبر SSO أو API.

### مثال على التكامل (.NET Core)

```csharp
// Service: BannerApiService.cs
public class BannerApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public BannerApiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _httpClient.BaseAddress = new Uri(_configuration["Banner:BaseUrl"]);
    }

    // جلب المقررات المسجلة للطالب
    public async Task<List<Course>> GetStudentCoursesAsync(string studentId, string term)
    {
        var url = $"/api/students/{studentId}/courses?term={term}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var courses = JsonSerializer.Deserialize<List<Course>>(jsonResponse);
        
        return courses;
    }

    // جلب الجدول الدراسي
    public async Task<List<ScheduleItem>> GetStudentScheduleAsync(string studentId, string term)
    {
        var url = $"/api/students/{studentId}/schedule?term={term}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var jsonResponse = await response.Content.ReadAsStringAsync();
        var schedule = JsonSerializer.Deserialize<List<ScheduleItem>>(jsonResponse);
        
        return schedule;
    }
}
```

---

## 4. الأمان والاعتمادات

### Blackboard API
- يتطلب **OAuth 2.0** للوصول (Client Credentials Flow)
- يجب تخزين Access Tokens بشكل آمن في SQL Server أو Memory Cache
- تجديد الـ Tokens عند انتهاء صلاحيتها (عادة 3600 ثانية)
- **لا تخزن Client Secret في الكود** - استخدم User Secrets أو Environment Variables

### QuestionMark API
- يستخدم **HTTP Basic Authentication**
- يجب إنشاء Service Account مخصص
- يجب أن يكون الحساب لديه صلاحيات Admin أو Access Server Configuration
- تخزين Credentials في User Secrets

### Banner API
- عادة يستخدم SSO أو API Keys
- تخزين Credentials بشكل آمن

### أفضل الممارسات (.NET Core)

1. **تخزين الاعتمادات بشكل آمن**
   ```csharp
   // appsettings.json (لا تضف القيم الحقيقية هنا)
   {
     "Blackboard": {
       "BaseUrl": "https://your-instance.learn.com",
       "ClientId": "", // سيتم ملؤه من User Secrets
       "ClientSecret": "" // سيتم ملؤه من User Secrets
     }
   }
   
   // استخدام User Secrets (للبيئة المحلية)
   dotnet user-secrets set "Blackboard:ClientId" "your-client-id"
   dotnet user-secrets set "Blackboard:ClientSecret" "your-client-secret"
   
   // أو Environment Variables (للإنتاج)
   export Blackboard__ClientId="your-client-id"
   export Blackboard__ClientSecret="your-client-secret"
   ```

2. **تخزين Tokens في Memory Cache أو SQL Server**
   ```csharp
   // Startup.cs أو Program.cs
   services.AddMemoryCache();
   // أو
   services.AddStackExchangeRedisCache(options =>
   {
       options.Configuration = "localhost:6379";
   });
   
   // في Service
   public class TokenCacheService
   {
       private readonly IMemoryCache _cache;
       
       public async Task<string> GetOrSetTokenAsync(Func<Task<string>> getToken)
       {
           const string cacheKey = "blackboard_access_token";
           
           if (_cache.TryGetValue(cacheKey, out string cachedToken))
           {
               return cachedToken;
           }
           
           var token = await getToken();
           _cache.Set(cacheKey, token, TimeSpan.FromMinutes(55)); // أقل من 60 دقيقة
           
           return token;
       }
   }
   ```

3. **معالجة الأخطاء وإعادة المحاولة**
   ```csharp
   // استخدام Polly للـ Retry Policy
   services.AddHttpClient<BlackboardApiService>()
       .AddPolicyHandler(GetRetryPolicy())
       .AddPolicyHandler(GetCircuitBreakerPolicy());
   
   static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
   {
       return HttpPolicyExtensions
           .HandleTransientHttpError()
           .WaitAndRetryAsync(3, retryAttempt => 
               TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
   }
   ```

4. **تسجيل الأخطاء**
   ```csharp
   // استخدام ILogger
   public class BlackboardApiService
   {
       private readonly ILogger<BlackboardApiService> _logger;
       
       public async Task<List<ContentItem>> GetCourseContentsAsync(string courseId)
       {
           try
           {
               // API call
           }
           catch (HttpRequestException ex)
           {
               _logger.LogError(ex, "Failed to fetch course contents for {CourseId}", courseId);
               throw;
           }
       }
   }
   ```

---

## 5. تحديث البيانات والتخزين

### التكرار الموصى به:

- **Blackboard**: كل 24 ساعة (كما هو موضح في الواجهة)
- **QuestionMark**: عند الطلب أو كل 6 ساعات
- **Banner**: عند تسجيل الدخول أو كل 12 ساعة

### آلية التحديث (.NET Core Background Service)

```csharp
// Services/DataSyncService.cs
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
        // جلب جميع الطلاب النشطين
        var activeStudents = await repository.GetActiveStudentsAsync();
        
        foreach (var student in activeStudents)
        {
            var courses = await blackboardService.GetAllCoursesAsync(student.UserId);
            
            foreach (var course in courses)
            {
                var engagement = await blackboardService
                    .GetCourseEngagementAsync(course.Id, student.UserId);
                
                // حفظ في قاعدة البيانات
                await repository.SaveEngagementDataAsync(
                    student.UserId, course.Id, engagement);
            }
        }
    }
}

// تسجيل الخدمة في Program.cs أو Startup.cs
services.AddHostedService<DataSyncService>();
```

### تخزين البيانات في SQL Server

```csharp
// Models/StudentEngagement.cs
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

// Repository
public interface IStudentDataRepository
{
    Task<StudentEngagement> GetEngagementAsync(string studentId, string courseId);
    Task SaveEngagementDataAsync(string studentId, string courseId, EngagementData data);
    Task<List<Student>> GetActiveStudentsAsync();
}

// Implementation
public class StudentDataRepository : IStudentDataRepository
{
    private readonly ApplicationDbContext _context;

    public StudentDataRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<StudentEngagement> GetEngagementAsync(
        string studentId, string courseId)
    {
        return await _context.StudentEngagements
            .FirstOrDefaultAsync(e => 
                e.StudentId == studentId && 
                e.CourseId == courseId);
    }

    public async Task SaveEngagementDataAsync(
        string studentId, string courseId, EngagementData data)
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
}
```

---

## 6. التكامل مع Frontend (ASP.NET Core MVC)

### Frontend MVC Controller

```csharp
// Frontend MVC Project
// Controllers/DashboardController.cs
[Authorize]
public class DashboardController : Controller
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public DashboardController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient("BackendApi");
        _configuration = configuration;
    }

    // GET: Dashboard/Index
    public async Task<IActionResult> Index()
    {
        try
        {
            // استدعاء Backend API (لا يتم استدعاء Blackboard API مباشرة)
            var response = await _httpClient.GetAsync("/api/blackboard/dashboard/overview");
            response.EnsureSuccessStatusCode();

            var jsonResponse = await response.Content.ReadAsStringAsync();
            var engagement = JsonSerializer.Deserialize<EngagementResponseDto>(jsonResponse);

            var viewModel = new DashboardViewModel
            {
                TotalLogins = engagement.AccessCount,
                TotalHours = engagement.TotalHours,
                CompletedAssignments = engagement.CompletedAssignments,
                TotalAssignments = engagement.TotalAssignments,
                AverageProgress = engagement.AverageProgress
            };

            return View(viewModel);
        }
        catch (HttpRequestException ex)
        {
            // معالجة الأخطاء
            ViewBag.Error = "فشل في جلب البيانات. يرجى المحاولة لاحقاً.";
            return View(new DashboardViewModel());
        }
    }

    // GET: Dashboard/CourseDetails/{courseId}
    public async Task<IActionResult> CourseDetails(string courseId)
    {
        try
        {
            // استدعاء Backend API لجلب بيانات المقرر
            var engagementResponse = await _httpClient
                .GetAsync($"/api/blackboard/courses/{courseId}/engagement");
            engagementResponse.EnsureSuccessStatusCode();

            var assignmentsResponse = await _httpClient
                .GetAsync($"/api/blackboard/courses/{courseId}/assignments");
            assignmentsResponse.EnsureSuccessStatusCode();

            var engagementJson = await engagementResponse.Content.ReadAsStringAsync();
            var assignmentsJson = await assignmentsResponse.Content.ReadAsStringAsync();

            var engagement = JsonSerializer.Deserialize<EngagementResponseDto>(engagementJson);
            var assignments = JsonSerializer.Deserialize<List<AssignmentDto>>(assignmentsJson);

            var viewModel = new CourseDetailsViewModel
            {
                CourseId = courseId,
                ContentViewsPercentage = engagement.ContentViewsPercentage,
                AssignmentSubmissionPercentage = engagement.AssignmentSubmissionPercentage,
                ForumParticipationPercentage = engagement.ForumParticipationPercentage,
                TotalHours = engagement.TotalHours,
                Assignments = assignments
            };

            return View(viewModel);
        }
        catch (HttpRequestException ex)
        {
            ViewBag.Error = "فشل في جلب بيانات المقرر.";
            return View(new CourseDetailsViewModel { CourseId = courseId });
        }
    }
}
```

### HttpClient Configuration في Frontend

```csharp
// Frontend MVC Project
// Program.cs أو Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // إعداد HttpClient للاتصال بـ Backend API
    services.AddHttpClient("BackendApi", client =>
    {
        client.BaseAddress = new Uri(Configuration["BackendApi:BaseUrl"]);
        client.DefaultRequestHeaders.Add("Accept", "application/json");
    })
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

    services.AddControllersWithViews();
}

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

### appsettings.json في Frontend

```json
{
  "BackendApi": {
    "BaseUrl": "https://api.yourdomain.com"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

### AJAX Calls من Views

```javascript
// Views/Dashboard/Index.cshtml
<script>
    async function refreshEngagementData() {
        try {
            const response = await fetch('/api/blackboard/dashboard/refresh', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer @ViewBag.Token'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateDashboardUI(data);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    function updateDashboardUI(data) {
        document.getElementById('content-views-percentage').textContent = 
            data.contentViewsPercentage + '%';
        document.getElementById('assignments-percentage').textContent = 
            data.assignmentSubmissionPercentage + '%';
        // ... تحديث باقي العناصر
    }
</script>
```
```

### View Models

```csharp
// ViewModels/DashboardViewModel.cs
public class DashboardViewModel
{
    public int TotalLogins { get; set; }
    public double TotalHours { get; set; }
    public int CompletedAssignments { get; set; }
    public int TotalAssignments { get; set; }
    public double AverageProgress { get; set; }
}

// ViewModels/CourseDetailsViewModel.cs
public class CourseDetailsViewModel
{
    public string CourseId { get; set; }
    public double ContentViewsPercentage { get; set; }
    public double AssignmentSubmissionPercentage { get; set; }
    public double ForumParticipationPercentage { get; set; }
    public double TotalHours { get; set; }
    public List<GradebookColumn> Assignments { get; set; }
    public List<Assessment> UpcomingExams { get; set; }
}
```

### Dependency Injection Setup - Backend API

```csharp
// Backend API Project
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// HTTP Clients للاتصال بـ External APIs (Blackboard, QuestionMark, Banner)
builder.Services.AddHttpClient<BlackboardApiService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Blackboard:BaseUrl"]);
    client.Timeout = TimeSpan.FromSeconds(30);
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());

builder.Services.AddHttpClient<QuestionMarkApiService>(client =>
{
    var customerId = builder.Configuration["QuestionMark:CustomerId"];
    client.BaseAddress = new Uri($"https://ondemand.questionmark.com/authoringapi/{customerId}/odata/");
})
.AddPolicyHandler(GetRetryPolicy());

builder.Services.AddHttpClient<BannerApiService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Banner:BaseUrl"]);
})
.AddPolicyHandler(GetRetryPolicy());

// Services
builder.Services.AddScoped<BlackboardApiService>();
builder.Services.AddScoped<QuestionMarkApiService>();
builder.Services.AddScoped<BannerApiService>();
builder.Services.AddScoped<IStudentDataRepository, StudentDataRepository>();

// Background Services
builder.Services.AddHostedService<DataSyncService>();

// API Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Authentication & Authorization
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = builder.Configuration["Identity:Authority"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### Dependency Injection Setup - Frontend MVC

```csharp
// Frontend MVC Project
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// HTTP Client للاتصال بـ Backend API فقط
builder.Services.AddHttpClient("BackendApi", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["BackendApi:BaseUrl"]);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());

// MVC
builder.Services.AddControllersWithViews();

// Authentication (إذا كان Backend API يتطلب Authentication)
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "oidc";
})
.AddCookie("Cookies")
.AddOpenIdConnect("oidc", options =>
{
    options.Authority = builder.Configuration["Identity:Authority"];
    options.ClientId = builder.Configuration["Identity:ClientId"];
    options.ClientSecret = builder.Configuration["Identity:ClientSecret"];
    options.ResponseType = "code";
    options.SaveTokens = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Dashboard}/{action=Index}/{id?}");

app.Run();
```

---

## 7. خريطة البيانات والـ Endpoints

### Blackboard API Endpoints المستخدمة:

| البيانات | Endpoint | Method | الاستخدام |
|---------|----------|--------|----------|
| **مشاهدة المحتوى** | `/courses/{courseId}/contents` | GET | جلب جميع المحتويات |
| **حالة المراجعة** | `/courses/{courseId}/contents/{contentId}/users/{userId}` | GET | التحقق من المراجعة |
| **الواجبات** | `/courses/{courseId}/gradebook/columns` | GET | جلب أعمدة التقديرات |
| **محاولات الواجب** | `/courses/{courseId}/gradebook/columns/{columnId}/attempts` | GET | التحقق من التسليم |
| **المنتديات** | `/courses/{courseId}/discussions/forums` | GET | جلب المنتديات |
| **مشاركات المنتدى** | `/courses/{courseId}/discussions/forums/{forumId}/posts` | GET | جلب المشاركات |
| **إحصائيات النشاط** | `/courses/{courseId}/analytics/users/{userId}/activity` | GET | جلب النشاط |
| **المصادقة** | `/learn/api/public/v1/oauth2/token` | POST | الحصول على Token |

### QuestionMark OData Endpoints:

| البيانات | Endpoint | الاستخدام |
|---------|----------|----------|
| **الاختبارات** | `/Assessments?$filter=...` | جلب الاختبارات المجدولة |
| **النتائج** | `/Results?$filter=StudentId eq '...'` | جلب نتائج الطالب |

---

## 8. مراجع إضافية

- [Blackboard Learn REST API Documentation](https://developer.anthology.com/portal/displayApi)
- [QuestionMark OData API Documentation](https://questionmark.github.io/qm-oap-docs/authoringodata/intro.html)
- [OData v4 Specification](https://www.odata.org/documentation/)
- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)

---

## 9. ملاحظات التطوير

### للـ Backend Developers (.NET Core):

1. **Service Layer Pattern**: قم بإنشاء Service Layer منفصل لكل API
2. **Dependency Injection**: استخدم DI container المدمج في .NET Core
3. **Caching**: استخدم IMemoryCache أو Redis للبيانات التي لا تتغير كثيراً
4. **Background Services**: استخدم Hosted Services للتحديثات الدورية
5. **Error Handling**: استخدم Middleware للتعامل مع الأخطاء بشكل مركزي
6. **Logging**: استخدم ILogger المدمج في .NET Core
7. **Configuration**: استخدم IConfiguration و User Secrets

### للـ Frontend Developers (ASP.NET Core MVC):

1. **View Models**: استخدم View Models لعرض البيانات
2. **Partial Views**: استخدم Partial Views للمكونات القابلة لإعادة الاستخدام
3. **AJAX**: استخدم AJAX للطلبات غير المتزامنة
4. **Loading States**: أضف مؤشرات تحميل في Views
5. **Error Handling**: استخدم Error Pages و Error Handling في Controllers

---

## 10. هيكل المشروع

### Backend API Project Structure

```
BackendApi/
├── Controllers/
│   ├── BlackboardController.cs
│   ├── QuestionMarkController.cs
│   └── BannerController.cs
├── Services/
│   ├── BlackboardApiService.cs
│   ├── QuestionMarkApiService.cs
│   ├── BannerApiService.cs
│   └── TokenCacheService.cs
├── Models/
│   ├── DTOs/
│   │   ├── EngagementResponseDto.cs
│   │   └── AssignmentDto.cs
│   └── Entities/
│       └── StudentEngagement.cs
├── Data/
│   ├── ApplicationDbContext.cs
│   └── Repositories/
│       └── StudentDataRepository.cs
├── BackgroundServices/
│   └── DataSyncService.cs
├── Program.cs
└── appsettings.json
```

### Frontend MVC Project Structure

```
FrontendMvc/
├── Controllers/
│   ├── DashboardController.cs
│   ├── CourseDetailsController.cs
│   └── ReportsController.cs
├── Views/
│   ├── Dashboard/
│   │   └── Index.cshtml
│   └── CourseDetails/
│       └── Index.cshtml
├── ViewModels/
│   ├── DashboardViewModel.cs
│   └── CourseDetailsViewModel.cs
├── wwwroot/
│   ├── css/
│   ├── js/
│   └── lib/
├── Program.cs
└── appsettings.json
```

---

## 11. قائمة التحقق للتنفيذ

### إعداد Backend API Project:
- [ ] إنشاء .NET Core 9 Web API Project
- [ ] إعداد SQL Server Database
- [ ] إعداد Entity Framework Core
- [ ] إعداد User Secrets للاعتمادات (Blackboard, QuestionMark, Banner)
- [ ] إعداد Swagger/OpenAPI

### Blackboard API Integration (في Backend فقط):
- [ ] إنشاء BlackboardApiService في Backend
- [ ] إعداد OAuth 2.0 Authentication
- [ ] تنفيذ وظائف جلب البيانات من Blackboard API
- [ ] تنفيذ وظائف حساب النسب المئوية
- [ ] إضافة Token Caching في Backend
- [ ] إنشاء API Endpoints في Backend Controller

### QuestionMark API Integration (في Backend فقط):
- [ ] إنشاء QuestionMarkApiService في Backend
- [ ] إعداد HTTP Basic Authentication
- [ ] تنفيذ وظائف جلب الاختبارات والنتائج
- [ ] إنشاء API Endpoints في Backend Controller

### قاعدة البيانات (في Backend):
- [ ] إنشاء Models (StudentEngagement, etc.)
- [ ] إنشاء DbContext
- [ ] إنشاء Repository Pattern
- [ ] إضافة Migrations

### Backend API Controllers:
- [ ] إنشاء BlackboardController مع جميع Endpoints
- [ ] إنشاء QuestionMarkController
- [ ] إضافة Authentication & Authorization
- [ ] إضافة Error Handling
- [ ] إضافة Response Caching

### Frontend MVC Project:
- [ ] إنشاء .NET Core 9 MVC Project
- [ ] إعداد HttpClient للاتصال بـ Backend API
- [ ] إنشاء Controllers (Dashboard, CourseDetails, etc.)
- [ ] إنشاء ViewModels
- [ ] تحديث Views لعرض البيانات من Backend API
- [ ] إضافة AJAX calls للـ Backend API

### Background Services (في Backend):
- [ ] إنشاء DataSyncService
- [ ] إعداد التحديثات الدورية
- [ ] إضافة Error Handling و Logging

### الأمان:
- [ ] إعداد Authentication بين Frontend و Backend
- [ ] إعداد CORS في Backend API
- [ ] إخفاء Credentials في User Secrets
- [ ] إضافة HTTPS
- [ ] إضافة Rate Limiting في Backend API

### الاختبار:
- [ ] اختبار Backend API Endpoints
- [ ] اختبار Frontend MVC Controllers
- [ ] اختبار التكامل بين Frontend و Backend
- [ ] اختبار Error Handling
- [ ] اختبار Performance

---

**آخر تحديث**: يناير 2026  
**الإصدار**: 2.0  
**التقنيات**: .NET Core, ASP.NET Core MVC, SQL Server
