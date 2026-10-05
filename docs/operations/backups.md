# Backup e restauração — SDD 11.6

Inventário com o operador em 04/10/2026: resposta **“não sei”** sobre rotina,
frequência, retenção e destino. Estado real da VPS **não confirmado**. Não há
prova de ausência de backups. Antes de ativar estes scripts, conferir crontab,
systemd timers, scripts locais, snapshots do provedor e repositórios existentes;
registrar proprietário, último backup verificável, retenção e teste de restore.
Não substituir uma rotina encontrada sem avaliar sua cobertura.

A proposta versionada usa Restic em repositório remoto criptografado, senha em
arquivo 0600 externo ao Git e credencial com acesso restrito ao repositório.
Acesso de recuperação deve ter cópia independente da VPS. Banco e objetos são
copiados com os escritores pausados, evitando anexos registrados sem objeto.
Não atende writers externos à malha: inventariá-los e pausar também antes da
operação. MinIO usa alias MC previamente configurado, sem credenciais no CLI.
Manter os dumps temporários em disco privado criptografado, com capacidade e
alerta de disco. Retenção proposta: 7 diários, 4 semanais, 6 mensais.

RPO proposto: 24 horas com execução diária; RTO alvo: 60 minutos, **não medido
em produção**. AOF/backup de Redis não substitui PostgreSQL e MinIO. A pausa de
escritas deve ser anunciada pelo operador. Cron/timer não instalado nesta PR.
`backup.sh` confirma envio/check antes de retenção e gera erro no syslog se
falhar. Monitorar falha e ausência de sucesso por mais de 25 horas, encaminhando
ao mesmo canal operacional de alertas. Alertas/credenciais de destino exigem
configuração do operador; não foram enviados a pessoas reais nesta entrega.

Ensaio obrigatório em CI: PostgreSQL/MinIO novos, usuários/projetos/anexos
sintéticos, dump/objetos/manifesto, restore, comparação dos registros e SHA-256,
tempo total e recovery-point. `restore.sh` só restaura arquivos em diretório
novo; nunca escolhe ou escreve um banco real. Importar o dump exclusivamente
na instância isolada (`pg_restore --exit-on-error`); copiar objetos num bucket
vazio e verificar a correspondência Attachment ↔ objeto antes de liberar uso.
Nenhuma migration é revertida. Ensaio sintético não confirma backup real da VPS.
