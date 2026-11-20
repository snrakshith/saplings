{{- define "sapling-quality.job" -}}
backoffLimit: 0
activeDeadlineSeconds: 7500
ttlSecondsAfterFinished: 86400
template:
  spec:
    serviceAccountName: {{ .values.serviceAccountName }}
    automountServiceAccountToken: false
    restartPolicy: Never
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
    containers:
      - name: quality
        image: {{ .image | quote }}
        args: ["run", {{ .values.selection | quote }}, "--config", {{ .values.configPath | quote }}]
        env:
          - name: QUALITY_STAGING
            value: "yes"
          - name: QUALITY_ORIGIN
            value: {{ .origin | quote }}
          - name: SAPLING_QUALITY_CONFIRM
            value: "yes"
        resources:
          requests: {cpu: 100m, memory: 128Mi}
          limits: {cpu: "2", memory: 1Gi}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities: {drop: ["ALL"]}
{{- end -}}
