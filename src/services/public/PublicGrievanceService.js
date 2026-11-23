import { BASE_URL } from "../../constant/url";
import { GETNETWORK } from "../../utils/Network";

export const toErrorText = (value, fallback = "Something went wrong") => {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    if (typeof value?.error?.message === "string") return value.error.message;
    try {
        return JSON.stringify(value);
    } catch (_) {
        return fallback;
    }
};

export const isApiSuccess = (result) => {
    if (!result) return false;
    if (result.ok === false) return false;
    if (result.success === false) return false;
    if (result.error && result.data == null) return false;
    const code = Number(result.statusCode || result.status || 0);
    if (code >= 400) return false;
    return true;
};

export const mapPublicQr = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const data = raw.data && typeof raw.data === "object" ? raw.data : raw;
    const vendor = data.vendor && typeof data.vendor === "object" ? data.vendor : {};
    const org = data.org && typeof data.org === "object" ? data.org : {};
    const categories = Array.isArray(data.categories)
        ? data.categories
              .map((c) => {
                  if (!c) return null;
                  if (typeof c === "string") {
                      return { value: c, label: c };
                  }
                  const value = String(c.value || c.key || c.id || "").trim();
                  if (!value) return null;
                  return {
                      value,
                      label: String(c.label || c.name || value),
                  };
              })
              .filter(Boolean)
        : [];

    return {
        raw: data,
        code: String(data.code || "").trim(),
        locationName: toErrorText(data.locationName || data.location, "—"),
        zoneCode: toErrorText(data.zoneCode, "—"),
        zoneName: toErrorText(data.zoneName || data.zone, "—"),
        vendor: {
            shopName: toErrorText(vendor.shopName || vendor.name, ""),
            ownerName: toErrorText(vendor.ownerName || vendor.owner, ""),
        },
        categories,
        org: {
            helpline: toErrorText(org.helpline || org.phone || org.contact, ""),
        },
    };
};

/** GET /public/qr/:code — public, no Bearer token */
export const fetchPublicQr = async (code) => {
    const cleaned = String(code || "").trim();
    if (!cleaned || cleaned.length < 4 || cleaned.length > 24) {
        return {
            result: null,
            ok: false,
            data: null,
            message: "QR code must be 4–24 characters",
        };
    }
    const result = await GETNETWORK(
        `${BASE_URL}public/qr/${encodeURIComponent(cleaned)}`,
        false
    );
    const data = mapPublicQr(result);
    return {
        result,
        ok: isApiSuccess(result) && Boolean(data?.code),
        data,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to load QR details"
        ),
    };
};

/**
 * POST /public/grievances — multipart/form-data, public, no Bearer token.
 * Field names: qrCode, category, description, contactNumber?, photo?
 */
export const submitPublicGrievance = async (payload = {}) => {
    const qrCode = String(payload.qrCode || "").trim();
    const category = String(payload.category || "").trim();
    const description = String(payload.description || "").trim();
    const contactNumber = String(payload.contactNumber || "").trim();

    if (!qrCode || qrCode.length < 4 || qrCode.length > 24) {
        return { ok: false, data: null, message: "QR code must be 4–24 characters" };
    }
    if (!category) {
        return { ok: false, data: null, message: "Please select a complaint category" };
    }
    if (description.length < 10 || description.length > 1500) {
        return {
            ok: false,
            data: null,
            message: "Description must be 10–1500 characters",
        };
    }
    if (contactNumber && !/^[6-9]\d{9}$/.test(contactNumber)) {
        return {
            ok: false,
            data: null,
            message: "Enter a valid 10-digit Indian mobile number",
        };
    }

    const form = new FormData();
    form.append("qrCode", qrCode);
    form.append("category", category);
    form.append("description", description);
    if (contactNumber) form.append("contactNumber", contactNumber);

    if (payload.photo?.uri) {
        form.append("photo", {
            uri: payload.photo.uri,
            type: payload.photo.type || "image/jpeg",
            name: payload.photo.fileName || payload.photo.name || "complaint.jpg",
        });
    }

    try {
        const response = await fetch(`${BASE_URL}public/grievances`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                // Do not set Content-Type — RN sets multipart boundary automatically
            },
            body: form,
        });
        const text = await response.text();
        let body = null;
        try {
            body = text ? JSON.parse(text) : null;
        } catch (_) {
            body = text ? { message: text } : null;
        }
        const result = {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
        const data = result?.data && typeof result.data === "object" ? result.data : null;
        return {
            result,
            ok: response.ok || response.status === 201,
            data: data
                ? {
                      ticketNo: toErrorText(data.ticketNo, "—"),
                      status: toErrorText(data.status, "open"),
                      locationName: toErrorText(data.locationName, ""),
                      message: toErrorText(
                          result.message,
                          "Grievance registered successfully."
                      ),
                  }
                : null,
            message: toErrorText(
                result?.error || result?.message,
                response.ok
                    ? "Grievance registered successfully."
                    : "Failed to submit grievance"
            ),
        };
    } catch (e) {
        return {
            result: null,
            ok: false,
            data: null,
            message: toErrorText(e?.message || e, "Failed to submit grievance"),
        };
    }
};
