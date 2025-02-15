const API_URL = "https://your-api-gateway-url.amazonaws.com/prod";

export const fetchFreeTierSolution = async (requirements) => {
    const res = await fetch(`${API_URL}/find_free_tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
    });
    return await res.json();
};
