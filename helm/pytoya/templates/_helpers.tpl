{{- define "pytoya.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "pytoya.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := include "pytoya.name" . -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{- define "pytoya.labels" -}}
app.kubernetes.io/name: {{ include "pytoya.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "pytoya.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pytoya.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "pytoya.image" -}}
{{- if .registry -}}
{{- printf "%s/%s" .registry .image -}}
{{- else -}}
{{- .image -}}
{{- end -}}
{{- end }}

{{- define "pytoya.configYaml" -}}
server:
  port: {{ .Values.api.config.server.port }}
  logLevel: {{ .Values.api.config.server.logLevel }}
database:
  host: {{ required "api.config.database.host is required" .Values.api.config.database.host | quote }}
  port: {{ .Values.api.config.database.port }}
  username: {{ required "api.config.database.username is required" .Values.api.config.database.username | quote }}
  password: "{{ "{{DB_PASSWORD}}" }}"
  database: {{ required "api.config.database.database is required" .Values.api.config.database.database | quote }}
redis:
  host: {{ required "api.config.redis.host is required" .Values.api.config.redis.host | quote }}
  port: {{ .Values.api.config.redis.port }}
queue:
  extraction:
    concurrency: {{ .Values.api.config.queue.extraction.concurrency | default 5 }}
jwt:
  secret: "{{ "{{JWT_SECRET}}" }}"
  expiration: {{ .Values.api.config.jwt.expiration | default "7d" | quote }}
paddleocr:
  baseUrl: {{ .Values.api.config.paddleocr.baseUrl | quote }}
features:
  manualExtraction: {{ .Values.api.config.features.manualExtraction | default true }}
security:
  cors:
    enabled: {{ .Values.api.config.security.cors.enabled | default true }}
    allowedOrigins:
    {{- range .Values.api.config.security.cors.allowedOrigins }}
      - {{ . | quote }}
    {{- end }}
    credentials: {{ .Values.api.config.security.cors.credentials | default true }}
    methods:
    {{- range .Values.api.config.security.cors.methods }}
      - {{ . | quote }}
    {{- end }}
    allowedHeaders:
    {{- range .Values.api.config.security.cors.allowedHeaders }}
      - {{ . | quote }}
    {{- end }}
  rateLimit:
    enabled: {{ .Values.api.config.security.rateLimit.enabled | default true }}
    ttl: {{ .Values.api.config.security.rateLimit.ttl | default 60000 }}
    limit: {{ .Values.api.config.security.rateLimit.limit | default 120 }}
    storage: {{ .Values.api.config.security.rateLimit.storage | default "memory" | quote }}
  accountLockout:
    enabled: {{ .Values.api.config.security.accountLockout.enabled | default true }}
    thresholds:
    {{- range .Values.api.config.security.accountLockout.thresholds }}
      - attempts: {{ .attempts }}
        {{- if .duration }}
        duration: {{ .duration }}
        {{- end }}
        {{- if .permanent }}
        permanent: {{ .permanent }}
        {{- end }}
    {{- end }}
  passwordPolicy:
    minLength: {{ .Values.api.config.security.passwordPolicy.minLength }}
    maxLength: {{ .Values.api.config.security.passwordPolicy.maxLength }}
    requireUppercase: {{ .Values.api.config.security.passwordPolicy.requireUppercase }}
    requireLowercase: {{ .Values.api.config.security.passwordPolicy.requireLowercase }}
    requireNumber: {{ .Values.api.config.security.passwordPolicy.requireNumber }}
    requireSpecialChar: {{ .Values.api.config.security.passwordPolicy.requireSpecialChar }}
    specialChars: {{ .Values.api.config.security.passwordPolicy.specialChars | quote }}
  usernamePolicy:
    minLength: {{ .Values.api.config.security.usernamePolicy.minLength }}
    maxLength: {{ .Values.api.config.security.usernamePolicy.maxLength }}
    pattern: {{ .Values.api.config.security.usernamePolicy.pattern | quote }}
{{- end }}

{{- define "pytoya.secretsStringData" -}}
DB_PASSWORD: {{ required "secrets.dbPassword is required" .Values.secrets.dbPassword | quote }}
JWT_SECRET: {{ required "secrets.jwtSecret is required" .Values.secrets.jwtSecret | quote }}
{{- end }}
