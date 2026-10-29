-- Las tablas de solo inserción bloqueaban UPDATE y DELETE fila por fila, pero
-- TRUNCATE vacía la tabla sin disparar esos triggers. Se bloquea también.
CREATE TRIGGER attendance_event_no_truncate
  BEFORE TRUNCATE ON "attendance_event"
  FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION nexora_forbid_mutation();
