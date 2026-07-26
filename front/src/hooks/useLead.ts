import { supabase } from "./supabase";
import type { Lead, Historico } from "../models/index";

async function selectAllLeads() {
    const usuario_id = localStorage.getItem('id_do_usuario');

    let Leads: Lead[] = []

    const { data, error } = await supabase
        .from('Leads')
        .select('*')
        .eq('cliente_id', usuario_id)
        .order('updated_at', { ascending: false });

    Leads = data as Lead[]
    if (error) {
        console.error(error)
        return Leads
    }
    return Leads
}

async function selectHistory(lead_id: number) {
    let historico: Historico[] = []

    const { data, error } = await supabase
        .from('Historico')
        .select('*')
        .eq('lead_id', lead_id)
        .order('criado_em', { ascending: true });

    historico = data as Historico[]
    if (error) {
        console.error(error)
        return historico
    }
    return historico
}

async function updateLead(id:number, lead: Lead) {
    const { data, error } = await supabase
        .from('Leads')
        .update(lead)
        .eq('id', id)

    if (error) {
        console.error(error)
        return []
    }
    return data
}

async function deleteLead(id:number) {
    const { data, error } = await supabase
        .from('Leads')
        .delete()
        .eq('id', id)

    if (error) {
        console.error(error)
        return []
    }
    return data
}

export { selectAllLeads, updateLead, deleteLead, selectHistory };
