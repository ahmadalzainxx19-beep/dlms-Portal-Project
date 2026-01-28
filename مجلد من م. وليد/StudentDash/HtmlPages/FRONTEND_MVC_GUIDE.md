# دليل Frontend MVC - .NET Core 9

## نظرة عامة

Frontend MVC هو مشروع .NET Core 9 MVC منفصل يتحمل مسؤولية:
- ✅ **عرض البيانات للمستخدمين**
- ✅ **التواصل مع Backend API فقط**
- ✅ **لا يتصل مباشرة بـ Blackboard API أو أي External API**
- ✅ **معالجة UI/UX**

### المعمارية:

```
Frontend MVC (.NET Core 9)
    ↓ HTTP Requests
Backend API (.NET Core 9)
```

---

## 1. إعداد المشروع

### إنشاء المشروع:

```bash
dotnet new mvc -n StudentDashboard.Web -f net9.0
cd StudentDashboard.Web
```

### إضافة الحزم المطلوبة:

```bash
# HTTP Client Policies
dotnet add package Microsoft.Extensions.Http.Polly

# Authentication
dotnet add package Microsoft.AspNetCore.Authentication.OpenIdConnect
```

---

## 2. إعداد HttpClient للاتصال بـ Backend API

### Program.cs

```csharp
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

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
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme)
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    options.Authority = builder.Configuration["Identity:Authority"];
    options.ClientId = builder.Configuration["Identity:ClientId"];
    options.ClientSecret = builder.Configuration["Identity:ClientSecret"];
    options.ResponseType = "code";
    options.SaveTokens = true;
    options.GetClaimsFromUserInfoEndpoint = true;
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

## 3. Service Layer للاتصال بـ Backend API

### Services/BackendApiService.cs

```csharp
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;

namespace StudentDashboard.Web.Services
{
    public class BackendApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<BackendApiService> _logger;

        public BackendApiService(
            IHttpClientFactory httpClientFactory,
            IHttpContextAccessor httpContextAccessor,
            ILogger<BackendApiService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("BackendApi");
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        // جلب بيانات التفاعل للمقرر
        public async Task<EngagementResponseDto> GetCourseEngagementAsync(string courseId)
        {
            try
            {
                await SetAuthorizationHeaderAsync();
                
                var response = await _httpClient.GetAsync($"/api/blackboard/courses/{courseId}/engagement");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var engagement = JsonSerializer.Deserialize<EngagementResponseDto>(
                    jsonResponse, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return engagement;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error fetching engagement data for course {CourseId}", courseId);
                throw;
            }
        }

        // جلب الواجبات للمقرر
        public async Task<List<AssignmentDto>> GetCourseAssignmentsAsync(string courseId)
        {
            try
            {
                await SetAuthorizationHeaderAsync();
                
                var response = await _httpClient.GetAsync($"/api/blackboard/courses/{courseId}/assignments");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var assignments = JsonSerializer.Deserialize<List<AssignmentDto>>(
                    jsonResponse,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return assignments;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error fetching assignments for course {CourseId}", courseId);
                throw;
            }
        }

        // جلب نظرة عامة على Dashboard
        public async Task<DashboardOverviewDto> GetDashboardOverviewAsync()
        {
            try
            {
                await SetAuthorizationHeaderAsync();
                
                var response = await _httpClient.GetAsync("/api/blackboard/dashboard/overview");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var overview = JsonSerializer.Deserialize<DashboardOverviewDto>(
                    jsonResponse,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return overview;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error fetching dashboard overview");
                throw;
            }
        }

        private async Task SetAuthorizationHeaderAsync()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext?.User?.Identity?.IsAuthenticated == true)
            {
                var token = await httpContext.GetTokenAsync("access_token");
                if (!string.IsNullOrEmpty(token))
                {
                    _httpClient.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Bearer", token);
                }
            }
        }
    }
}
```

### Models/DTOs

```csharp
// Models/DTOs/EngagementResponseDto.cs
namespace StudentDashboard.Web.Models.DTOs
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

    public class DashboardOverviewDto
    {
        public int TotalLogins { get; set; }
        public double TotalHours { get; set; }
        public double AverageProgress { get; set; }
        public int CompletedAssignments { get; set; }
        public int TotalAssignments { get; set; }
    }
}
```

---

## 4. Controllers

### Controllers/DashboardController.cs

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentDashboard.Web.Services;
using StudentDashboard.Web.Models.ViewModels;

namespace StudentDashboard.Web.Controllers
{
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly BackendApiService _backendApiService;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(
            BackendApiService backendApiService,
            ILogger<DashboardController> logger)
        {
            _backendApiService = backendApiService;
            _logger = logger;
        }

        // GET: Dashboard/Index
        public async Task<IActionResult> Index()
        {
            try
            {
                // استدعاء Backend API (لا يتم استدعاء Blackboard API مباشرة)
                var overview = await _backendApiService.GetDashboardOverviewAsync();

                var viewModel = new DashboardViewModel
                {
                    TotalLogins = overview.TotalLogins,
                    TotalHours = Math.Round(overview.TotalHours, 1),
                    AverageProgress = Math.Round(overview.AverageProgress, 1),
                    CompletedAssignments = overview.CompletedAssignments,
                    TotalAssignments = overview.TotalAssignments
                };

                return View(viewModel);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error loading dashboard");
                ViewBag.Error = "فشل في جلب البيانات. يرجى المحاولة لاحقاً.";
                return View(new DashboardViewModel());
            }
        }
    }
}
```

### Controllers/CourseDetailsController.cs

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StudentDashboard.Web.Services;
using StudentDashboard.Web.Models.ViewModels;

namespace StudentDashboard.Web.Controllers
{
    [Authorize]
    public class CourseDetailsController : Controller
    {
        private readonly BackendApiService _backendApiService;
        private readonly ILogger<CourseDetailsController> _logger;

        public CourseDetailsController(
            BackendApiService backendApiService,
            ILogger<CourseDetailsController> logger)
        {
            _backendApiService = backendApiService;
            _logger = logger;
        }

        // GET: CourseDetails/Index/{courseId}
        public async Task<IActionResult> Index(string courseId)
        {
            if (string.IsNullOrEmpty(courseId))
            {
                return RedirectToAction("Index", "Dashboard");
            }

            try
            {
                // استدعاء Backend API لجلب بيانات المقرر
                var engagementTask = _backendApiService.GetCourseEngagementAsync(courseId);
                var assignmentsTask = _backendApiService.GetCourseAssignmentsAsync(courseId);

                await Task.WhenAll(engagementTask, assignmentsTask);

                var engagement = await engagementTask;
                var assignments = await assignmentsTask;

                var viewModel = new CourseDetailsViewModel
                {
                    CourseId = courseId,
                    ContentViewsPercentage = Math.Round(engagement.ContentViewsPercentage, 1),
                    AssignmentSubmissionPercentage = Math.Round(engagement.AssignmentSubmissionPercentage, 1),
                    ForumParticipationPercentage = Math.Round(engagement.ForumParticipationPercentage, 1),
                    TotalHours = Math.Round(engagement.TotalHours, 1),
                    AccessCount = engagement.AccessCount,
                    Assignments = assignments.Select(a => new AssignmentViewModel
                    {
                        Id = a.Id,
                        Name = a.Name,
                        DueDate = a.DueDate,
                        Status = a.Status,
                        Grade = a.Grade,
                        MaxGrade = a.MaxGrade
                    }).ToList()
                };

                return View(viewModel);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error loading course details for {CourseId}", courseId);
                ViewBag.Error = "فشل في جلب بيانات المقرر.";
                return View(new CourseDetailsViewModel { CourseId = courseId });
            }
        }

        // GET: CourseDetails/Refresh/{courseId}
        [HttpGet]
        public async Task<IActionResult> Refresh(string courseId)
        {
            try
            {
                var engagement = await _backendApiService.GetCourseEngagementAsync(courseId);
                return Json(new
                {
                    success = true,
                    data = new
                    {
                        contentViewsPercentage = Math.Round(engagement.ContentViewsPercentage, 1),
                        assignmentSubmissionPercentage = Math.Round(engagement.AssignmentSubmissionPercentage, 1),
                        forumParticipationPercentage = Math.Round(engagement.ForumParticipationPercentage, 1),
                        totalHours = Math.Round(engagement.TotalHours, 1),
                        accessCount = engagement.AccessCount
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing course data");
                return Json(new { success = false, error = "فشل في تحديث البيانات" });
            }
        }
    }
}
```

---

## 5. ViewModels

### Models/ViewModels/DashboardViewModel.cs

```csharp
namespace StudentDashboard.Web.Models.ViewModels
{
    public class DashboardViewModel
    {
        public int TotalLogins { get; set; }
        public double TotalHours { get; set; }
        public double AverageProgress { get; set; }
        public int CompletedAssignments { get; set; }
        public int TotalAssignments { get; set; }
    }
}
```

### Models/ViewModels/CourseDetailsViewModel.cs

```csharp
namespace StudentDashboard.Web.Models.ViewModels
{
    public class CourseDetailsViewModel
    {
        public string CourseId { get; set; }
        public double ContentViewsPercentage { get; set; }
        public double AssignmentSubmissionPercentage { get; set; }
        public double ForumParticipationPercentage { get; set; }
        public double TotalHours { get; set; }
        public int AccessCount { get; set; }
        public List<AssignmentViewModel> Assignments { get; set; } = new();
    }

    public class AssignmentViewModel
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

## 6. Views

### Views/Dashboard/Index.cshtml

```html
@model StudentDashboard.Web.Models.ViewModels.DashboardViewModel

@{
    ViewData["Title"] = "لوحة التحكم";
}

<div class="container">
    <h1>لوحة التحكم الأكاديمية</h1>

    @if (ViewBag.Error != null)
    {
        <div class="alert alert-danger">
            @ViewBag.Error
        </div>
    }

    <div class="row">
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5>مرات الدخول</h5>
                    <h2>@Model.TotalLogins</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5>ساعات النشاط</h5>
                    <h2>@Model.TotalHours</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5>متوسط التقدم</h5>
                    <h2>@Model.AverageProgress%</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5>الواجبات</h5>
                    <h2>@Model.CompletedAssignments / @Model.TotalAssignments</h2>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Views/CourseDetails/Index.cshtml

```html
@model StudentDashboard.Web.Models.ViewModels.CourseDetailsViewModel

@{
    ViewData["Title"] = "تفاصيل المقرر";
}

<div class="container">
    <h1>تفاصيل المقرر: @Model.CourseId</h1>

    @if (ViewBag.Error != null)
    {
        <div class="alert alert-danger">
            @ViewBag.Error
        </div>
    }

    <!-- إحصائيات التفاعل -->
    <div class="row mb-4">
        <div class="col-md-4">
            <div class="card">
                <div class="card-body">
                    <h5>مشاهدة المحتوى</h5>
                    <h2 id="content-views">@Model.ContentViewsPercentage%</h2>
                    <div class="progress">
                        <div class="progress-bar" style="width: @Model.ContentViewsPercentage%"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card">
                <div class="card-body">
                    <h5>تسليم الواجبات</h5>
                    <h2 id="assignments-submission">@Model.AssignmentSubmissionPercentage%</h2>
                    <div class="progress">
                        <div class="progress-bar" style="width: @Model.AssignmentSubmissionPercentage%"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card">
                <div class="card-body">
                    <h5>المشاركة في المنتديات</h5>
                    <h2 id="forum-participation">@Model.ForumParticipationPercentage%</h2>
                    <div class="progress">
                        <div class="progress-bar" style="width: @Model.ForumParticipationPercentage%"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- جدول الواجبات -->
    <div class="card">
        <div class="card-header">
            <h5>الواجبات</h5>
            <button class="btn btn-sm btn-primary" onclick="refreshData()">تحديث</button>
        </div>
        <div class="card-body">
            <table class="table">
                <thead>
                    <tr>
                        <th>اسم الواجب</th>
                        <th>تاريخ التسليم</th>
                        <th>الحالة</th>
                        <th>الدرجة</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach (var assignment in Model.Assignments)
                    {
                        <tr>
                            <td>@assignment.Name</td>
                            <td>@assignment.DueDate?.ToString("yyyy-MM-dd")</td>
                            <td>@assignment.Status</td>
                            <td>@assignment.Grade / @assignment.MaxGrade</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
    async function refreshData() {
        try {
            const response = await fetch('/CourseDetails/Refresh?courseId=@Model.CourseId');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('content-views').textContent = result.data.contentViewsPercentage + '%';
                document.getElementById('assignments-submission').textContent = result.data.assignmentSubmissionPercentage + '%';
                document.getElementById('forum-participation').textContent = result.data.forumParticipationPercentage + '%';
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }
</script>
```

---

## 7. appsettings.json

```json
{
  "BackendApi": {
    "BaseUrl": "https://api.yourdomain.com"
  },
  "Identity": {
    "Authority": "https://your-identity-server.com",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret"
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

## 8. Dependency Injection

```csharp
// في Program.cs
builder.Services.AddScoped<BackendApiService>();
builder.Services.AddHttpContextAccessor();
```

---

## 9. قائمة التحقق

- [ ] إنشاء المشروع
- [ ] إضافة الحزم المطلوبة
- [ ] إعداد HttpClient للاتصال بـ Backend API
- [ ] إنشاء BackendApiService
- [ ] إنشاء Controllers
- [ ] إنشاء ViewModels
- [ ] إنشاء Views
- [ ] إعداد Authentication
- [ ] إضافة Error Handling
- [ ] اختبار التكامل مع Backend API

---

## 10. ملاحظات مهمة

### ⚠️ لا تقم بـ:
- ❌ الاتصال مباشرة بـ Blackboard API من Frontend
- ❌ تخزين API Keys في Frontend
- ❌ جعل Backend API Credentials متاحة في Frontend

### ✅ افعل:
- ✅ استخدم Backend API فقط
- ✅ استخدم Authentication Tokens
- ✅ أضف Error Handling
- ✅ أضف Loading States
- ✅ استخدم Caching حيثما أمكن

---

**آخر تحديث**: يناير 2026  
**الإصدار**: .NET Core 9
