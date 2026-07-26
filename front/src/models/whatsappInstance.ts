import type { Usuario } from "./usuario";
import { WhatsAppProvider, InstanceStatus } from "./enums";

export interface WhatsappInstance {
  id: number;
  cliente?: Usuario;
  cliente_id: number;
  provider: WhatsAppProvider;
  status: InstanceStatus;
  session_path?: string | null;
  qr_code?: string | null;
  created_at: Date;
  updated_at: Date;
}

export default WhatsappInstance;
