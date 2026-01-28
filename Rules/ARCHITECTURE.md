# KAUPortal .NET 10 & Tailwind CSS Master Rules

## 1. Architectural Separation (Core Rule)
- **Areas**: UI only. Contains Controllers and Razor Views (`Areas/<AreaName>/Views/`).
- **Modules**: Business Logic only. Contains Services, Models/DTOs, Constants, and Validation (`Modules/<ModuleName>/`).
- **Mapping**: Controllers convert UI/Discovery data into Module DTOs before calling services.

## 2. API Routing (Static & Type-Safe)
- **Pattern**: Every module MUST have `Modules/<ModuleName>/Constants/<ModuleName>ApiRoutes.cs`.
- **Implementation**: Static class with methods returning interpolated relative strings.
- **Rule**: No inheriting from `BaseApiRoute`. No absolute URLs. No `string.Format`.
- **Example**: 
  public static class StudentApiRoutes {
      private const string Base = "student";
      public static string GetById(object id) => $"{Base}/items/{id}";
  }

## 3. Communication (RequestManager)
- **Standard**: Do NOT use `HttpClient` directly in services.
- **Service Registration**: Inject `IRequestManager` into services using **.NET 10 Primary Constructors**.
- **Execution**: `await _requestManager.SendAsync<T>(ApiRequest.Get(path))`.
- **Logic**: Use `Preview` API for dry-runs and `Import` for commits as per project standards.

## 4. Model & DTO Organization
- Place in `Modules/<ModuleName>/Models/`.
- **Request**: DTOs sent to API (`CreateCourseDto`).
- **Response**: DTOs received from API (`CourseDto`).
- **Naming**: Use `PascalCase` for C# and `camelCase` for JSON. Use `required` properties for mandatory API fields.

## 5. UI & Tailwind CSS inside Url (https://tailwindcss.com/docs/)
- **Framework**: Tailwind CSS. Use `flex`, `grid`, and `rounded-xl`.
- **RTL Support**: Use logical properties (`me-`, `ps-`) instead of directional ones (`ml-`, `pr-`).
- **Bilingual**: Use `isArabic ? item.TitleAr : item.TitleEn`. Spans MUST have `data-ar` and `data-en`.

## 6. Validation & Security
- **Location**: `Modules/<ModuleName>/Validation/`.
- **Response**: Use the standard envelope: `{ success: false, errors: [{ field, message }] }`.
- **Identity**: Use `IDynamicMenuService` for permission-based UI rendering.

## 7. Logging & Telemetry
- Inject `ILogger<T>` in all services.
- Log `Information` for flows, `Warning` for recoverable issues, and `Error` for failures with full exception details.