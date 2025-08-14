const apiKey = process.env.NEXT_PUBLIC_SUPABASE;
const apiURL = process.env.NEXT_PUBLIC_APIURL;
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(apiURL, apiKey)

async function selectAllLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select()

    if (error) {
        console.error(error)
        return []
    }
    console.log(data);
    return data
}

async function updateLead(id, qualidade) {
    const { data, error } = await supabase
        .from('leads')
        .update({ qualidade })
        .eq('id', id)

    if (error) {
        console.error(error)
        return []
    }
    console.log(data);
    return data
}

export { selectAllLeads, updateLead };
