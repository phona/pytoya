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

{{- define "pytoya.basePath" -}}
{{- $raw := default "" .Values.global.basePath -}}
{{- $trimmed := trim $raw -}}
{{- if or (eq $trimmed "") (eq $trimmed "/") -}}
{{- "" -}}
{{- else -}}
{{- $withLeading := $trimmed -}}
{{- if not (hasPrefix "/" $withLeading) -}}
{{- $withLeading = printf "/%s" $withLeading -}}
{{- end -}}
{{- if hasSuffix "/" $withLeading -}}
{{- trimSuffix "/" $withLeading -}}
{{- else -}}
{{- $withLeading -}}
{{- end -}}
{{- end -}}
{{- end }}
