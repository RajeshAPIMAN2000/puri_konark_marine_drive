import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyAlert } from "../../../components/commonComponents/MyAlert";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    NAVY,
    ORANGE,
    RED,
    WHITE,
} from "../../../constant/color";
import {
    CATAGORIES,
    CITIZENCONTACT,
    DELETE,
    EMAIL,
    FIELDATTENDANCE,
    HIDE,
    LOCATION,
    PASSWORD,
    PROFILE,
    REPORTS,
    SHOW,
    SUPERVISOR,
    TITLE,
    VENDOR,
    ZONE,
} from "../../../constant/imagePath";
import {
    fetchSystemSettings,
    normalizeSettings,
    resetDemoSeed,
    updateSystemSettings,
} from "../../../services/system/SystemSettingsService";
import {
    createSupervisor as apiCreateSupervisor,
    deleteSupervisor as apiDeleteSupervisor,
    fetchSupervisors,
    toErrorText,
    updateSupervisor as apiUpdateSupervisor,
} from "../../../services/supervisors/SupervisorsService";
import {
    createUser as apiCreateUser,
    fetchUsers,
    roleRequiresSupervisor,
    updateUser as apiUpdateUser,
    USER_ROLE_OPTIONS,
} from "../../../services/users/UsersService";

const SCREEN = Dimensions.get("screen");

const ROLES = USER_ROLE_OPTIONS.map((item) => item.label);

const PIN_COLORS = [
    "#2563EB",
    "#0F766E",
    "#7C3AED",
    "#DB2777",
    "#EA5F0B",
    "#16A34A",
    "#DC2626",
    "#4B5563",
    "#0D9488",
    "#6D28D9",
];

const FieldLabel = ({ icon, text }) => (
    <View style={styles.fieldLabelRow}>
        <Image source={icon} style={styles.fieldIcon} resizeMode="contain" />
        <Text allowFontScaling={false} style={styles.fieldLabel}>{text}</Text>
    </View>
);

const CreateUserModal = ({
    visible,
    supervisors = [],
    submitting = false,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState("");
    const [role, setRole] = useState("Field Staff");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [supervisorId, setSupervisorId] = useState(null);
    const [phone, setPhone] = useState("");
    const [roleOpen, setRoleOpen] = useState(false);
    const [zoneOpen, setZoneOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setName("");
        setRole("Field Staff");
        setEmail("");
        setPassword("");
        setShowPassword(false);
        setSupervisorId(null);
        setPhone("");
        setRoleOpen(false);
        setZoneOpen(false);
    }, [visible]);

    const needsSupervisor = roleRequiresSupervisor(role);
    const selectedSupervisor = supervisors.find(
        (item) => String(item.id) === String(supervisorId)
    );

    const close = () => {
        if (submitting) return;
        setRoleOpen(false);
        setZoneOpen(false);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
            <Pressable style={styles.modalRoot} onPress={close}>
                <Pressable style={styles.formCard} onPress={() => {}}>
                    <View style={styles.formHeader}>
                        <Text allowFontScaling={false} style={styles.formTitle}>Create user</Text>
                        <TouchableOpacity onPress={close} hitSlop={10} disabled={submitting}>
                            <Text allowFontScaling={false} style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={TITLE} text="FULL NAME" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Full name"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={SUPERVISOR} text="ROLE" />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setRoleOpen((v) => !v);
                                        setZoneOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.dropValue}>{role}</Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                </TouchableOpacity>
                                {roleOpen && (
                                    <View style={styles.menu}>
                                        {ROLES.map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setRole(item);
                                                    setRoleOpen(false);
                                                    if (!roleRequiresSupervisor(item)) {
                                                        setSupervisorId(null);
                                                    }
                                                }}
                                            >
                                                <Text allowFontScaling={false} style={styles.menuTxt}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={EMAIL} text="EMAIL" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholder="email@example.com"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={PASSWORD} text="PASSWORD" />
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        allowFontScaling={false}
                                        style={styles.passwordInput}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        placeholder="Min 6 characters"
                                        placeholderTextColor={GREY}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                                        <Image
                                            source={showPassword ? HIDE : SHOW}
                                            style={styles.eyeIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel
                                    icon={ZONE}
                                    text={needsSupervisor ? "ASSIGNED SUPERVISOR" : "SUPERVISOR (OPTIONAL)"}
                                />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setZoneOpen((v) => !v);
                                        setRoleOpen(false);
                                    }}
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[styles.dropValue, !selectedSupervisor && styles.placeholder]}
                                        numberOfLines={1}
                                    >
                                        {selectedSupervisor
                                            ? `${selectedSupervisor.zone} — ${selectedSupervisor.name}`
                                            : "Select..."}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                </TouchableOpacity>
                                {zoneOpen && (
                                    <View style={styles.menu}>
                                        {!needsSupervisor ? (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setSupervisorId(null);
                                                    setZoneOpen(false);
                                                }}
                                            >
                                                <Text allowFontScaling={false} style={styles.menuTxt}>None</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {supervisors.map((item) => (
                                            <TouchableOpacity
                                                key={String(item.id)}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setSupervisorId(item.id);
                                                    setZoneOpen(false);
                                                }}
                                            >
                                                <Image source={ZONE} style={styles.menuIcon} resizeMode="contain" />
                                                <Text allowFontScaling={false} style={styles.menuTxt}>
                                                    {item.zone} — {item.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={CITIZENCONTACT} text="PHONE (OPTIONAL)" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    placeholder="Mobile number"
                                    placeholderTextColor={GREY}
                                    maxLength={20}
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                            disabled={submitting}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            disabled={submitting}
                            onPress={() =>
                                onSubmit({
                                    name,
                                    role,
                                    email,
                                    password,
                                    supervisorId,
                                    phone,
                                })
                            }
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text allowFontScaling={false} style={styles.saveTxt}>Create user</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const EditUserModal = ({
    visible,
    user,
    supervisors = [],
    submitting = false,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [supervisorId, setSupervisorId] = useState(null);
    const [active, setActive] = useState(true);
    const [zoneOpen, setZoneOpen] = useState(false);

    useEffect(() => {
        if (!visible || !user) return;
        setName(user.name || "");
        setPhone(user.phone || "");
        setPassword("");
        setShowPassword(false);
        setSupervisorId(user.supervisorId ?? null);
        setActive(user.active !== false);
        setZoneOpen(false);
    }, [visible, user]);

    const selectedSupervisor = supervisors.find(
        (item) => String(item.id) === String(supervisorId)
    );

    const close = () => {
        if (submitting) return;
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
            <Pressable style={styles.modalRoot} onPress={close}>
                <Pressable style={styles.formCard} onPress={() => {}}>
                    <View style={styles.formHeader}>
                        <Text allowFontScaling={false} style={styles.formTitle}>Edit user</Text>
                        <TouchableOpacity onPress={close} hitSlop={10} disabled={submitting}>
                            <Text allowFontScaling={false} style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <FieldLabel icon={EMAIL} text="EMAIL (READ ONLY)" />
                        <TextInput
                            allowFontScaling={false}
                            style={[styles.input, { opacity: 0.7 }]}
                            value={user?.email || ""}
                            editable={false}
                        />

                        <FieldLabel icon={TITLE} text="FULL NAME" />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor={GREY}
                        />

                        <FieldLabel icon={CITIZENCONTACT} text="PHONE" />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={20}
                            placeholderTextColor={GREY}
                        />

                        <FieldLabel icon={PASSWORD} text="NEW PASSWORD (OPTIONAL)" />
                        <View style={styles.passwordRow}>
                            <TextInput
                                allowFontScaling={false}
                                style={styles.passwordInput}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholder="Leave blank to keep current"
                                placeholderTextColor={GREY}
                            />
                            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                                <Image
                                    source={showPassword ? HIDE : SHOW}
                                    style={styles.eyeIcon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>

                        <FieldLabel icon={ZONE} text="ASSIGNED SUPERVISOR" />
                        <TouchableOpacity
                            style={styles.dropField}
                            activeOpacity={0.85}
                            onPress={() => setZoneOpen((v) => !v)}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[styles.dropValue, !selectedSupervisor && styles.placeholder]}
                                numberOfLines={1}
                            >
                                {selectedSupervisor
                                    ? `${selectedSupervisor.zone} — ${selectedSupervisor.name}`
                                    : "Select..."}
                            </Text>
                            <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                        </TouchableOpacity>
                        {zoneOpen && (
                            <View style={styles.menu}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setSupervisorId(null);
                                        setZoneOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.menuTxt}>None</Text>
                                </TouchableOpacity>
                                {supervisors.map((item) => (
                                    <TouchableOpacity
                                        key={String(item.id)}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setSupervisorId(item.id);
                                            setZoneOpen(false);
                                        }}
                                    >
                                        <Text allowFontScaling={false} style={styles.menuTxt}>
                                            {item.zone} — {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text allowFontScaling={false} style={styles.toggleTitle}>
                                    Account Active
                                </Text>
                                <Text allowFontScaling={false} style={styles.toggleSub}>
                                    {active ? "User can sign in" : "User is deactivated"}
                                </Text>
                            </View>
                            <Switch
                                value={active}
                                onValueChange={setActive}
                                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                                thumbColor={active ? GREEN : "#F8FAFC"}
                            />
                        </View>
                    </ScrollView>
                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                            disabled={submitting}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            disabled={submitting}
                            onPress={() =>
                                onSubmit({
                                    id: user?.id,
                                    name,
                                    phone,
                                    password,
                                    supervisorId,
                                    active,
                                })
                            }
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text allowFontScaling={false} style={styles.saveTxt}>Save changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const AddSupervisorModal = ({ visible, initial = null, submitting = false, onClose, onSubmit }) => {
    const [name, setName] = useState("");
    const [mobile, setMobile] = useState("");
    const [code, setCode] = useState("");
    const [color, setColor] = useState(PIN_COLORS[0]);
    const [segment, setSegment] = useState("");
    const [notes, setNotes] = useState("");
    const isEdit = !!initial?.id;

    useEffect(() => {
        if (!visible) return;
        setName(initial?.name || "");
        setMobile(initial?.mobile || initial?.phone || "");
        setCode(String(initial?.zoneCode || initial?.letter || "").toUpperCase().slice(0, 1));
        setColor(initial?.color || PIN_COLORS[0]);
        setSegment(initial?.assignedRoadSegment || initial?.segment || "");
        setNotes(initial?.notes || "");
    }, [visible, initial]);

    const close = () => {
        if (submitting) return;
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
            <Pressable style={styles.modalRoot} onPress={close}>
                <Pressable style={styles.formCard} onPress={() => {}}>
                    <View style={styles.formHeader}>
                        <Text allowFontScaling={false} style={styles.formTitle}>
                            {isEdit ? "Edit supervisor" : "Add supervisor"}
                        </Text>
                        <TouchableOpacity onPress={close} hitSlop={10} disabled={submitting}>
                            <Text allowFontScaling={false} style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={TITLE} text="FULL NAME" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Supervisor name"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={CITIZENCONTACT} text="MOBILE" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={mobile}
                                    onChangeText={setMobile}
                                    keyboardType="phone-pad"
                                    placeholder="10-digit mobile"
                                    placeholderTextColor={GREY}
                                    maxLength={10}
                                />
                            </View>
                        </View>
                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={ZONE} text="ZONE CODE (A-Z)" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={code}
                                    onChangeText={(value) => setCode(value.toUpperCase().slice(0, 1))}
                                    autoCapitalize="characters"
                                    maxLength={1}
                                    placeholder="A"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={CATAGORIES} text="PIN COLOUR (MAP)" />
                                <View style={styles.colorRow}>
                                    {PIN_COLORS.map((item) => {
                                        const selected = item === color;
                                        return (
                                            <TouchableOpacity
                                                key={item}
                                                activeOpacity={0.85}
                                                onPress={() => setColor(item)}
                                                style={[
                                                    styles.colorDot,
                                                    { backgroundColor: item },
                                                    selected && styles.colorDotOn,
                                                ]}
                                            />
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                        <FieldLabel icon={LOCATION} text="ASSIGNED ROAD SEGMENT" />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={segment}
                            onChangeText={setSegment}
                            placeholder="e.g. Pipili – Ramachandi"
                            placeholderTextColor={GREY}
                        />
                        <FieldLabel icon={REPORTS} text="NOTES (OPTIONAL)" />
                        <TextInput
                            allowFontScaling={false}
                            style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Optional notes"
                            placeholderTextColor={GREY}
                            multiline
                        />
                    </ScrollView>
                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                            disabled={submitting}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            disabled={submitting}
                            onPress={() =>
                                onSubmit({
                                    id: initial?.id,
                                    name,
                                    mobile,
                                    code,
                                    color,
                                    segment,
                                    notes,
                                })
                            }
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text allowFontScaling={false} style={styles.saveTxt}>
                                    {isEdit ? "Update" : "Save"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default function UserandSettingsScreen() {
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersRefreshing, setUsersRefreshing] = useState(false);
    const [userSaving, setUserSaving] = useState(false);
    const [supervisors, setSupervisors] = useState([]);
    const [supLoading, setSupLoading] = useState(false);
    const [supRefreshing, setSupRefreshing] = useState(false);
    const [supSaving, setSupSaving] = useState(false);
    const [userQuery, setUserQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All roles");
    const [roleOpen, setRoleOpen] = useState(false);
    const [supQuery, setSupQuery] = useState("");
    const [userForm, setUserForm] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [supForm, setSupForm] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
    const [deleteSupervisorId, setDeleteSupervisorId] = useState(null);
    const [toastMessage, setToastMessage] = useState({ visible: false, msg: "", type: "" });
    const [settings, setSettings] = useState(normalizeSettings({}));
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsRefreshing, setSettingsRefreshing] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    const showToast = useCallback((msg, type) => {
        setToastMessage({ visible: true, msg: toErrorText(msg, String(msg || "")), type });
    }, []);

    const loadSettings = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setSettingsRefreshing(true);
            else setSettingsLoading(true);
            try {
                const res = await fetchSystemSettings();
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                setSettings(res.data);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load settings"), "error");
            } finally {
                setSettingsLoading(false);
                setSettingsRefreshing(false);
            }
        },
        [showToast]
    );

    const loadSupervisors = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setSupRefreshing(true);
            else setSupLoading(true);
            try {
                const res = await fetchSupervisors({ page: 1, limit: 50 });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setSupervisors([]);
                    return;
                }
                setSupervisors(res.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load supervisors"), "error");
                setSupervisors([]);
            } finally {
                setSupLoading(false);
                setSupRefreshing(false);
            }
        },
        [showToast]
    );

    const loadUsers = useCallback(
        async ({ soft = false, q } = {}) => {
            if (soft) setUsersRefreshing(true);
            else setUsersLoading(true);
            try {
                const res = await fetchUsers({
                    page: 1,
                    limit: 50,
                    role: roleFilter === "All roles" ? undefined : roleFilter,
                    q: q != null ? q : undefined,
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setUsers([]);
                    return;
                }
                setUsers(res.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load users"), "error");
                setUsers([]);
            } finally {
                setUsersLoading(false);
                setUsersRefreshing(false);
            }
        },
        [roleFilter, showToast]
    );

    useEffect(() => {
        if (tab === "settings") loadSettings();
        if (tab === "supervisors") loadSupervisors();
        if (tab === "users") {
            loadUsers();
            if (!supervisors.length) loadSupervisors({ soft: true });
        }
    }, [tab, loadSettings, loadSupervisors, loadUsers, supervisors.length]);

    const updateSetting = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        if (settingsSaving) return;
        setSettingsSaving(true);
        try {
            const res = await updateSystemSettings({
                app_name: settings.app_name,
                organization: settings.organization,
                helpline_number: settings.helpline_number,
                support_email: settings.support_email,
                maintenance_mode: settings.maintenance_mode,
                notification_enabled: settings.notification_enabled,
            });
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setSettings(res.data);
            showToast("Settings saved successfully", "success");
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save settings"), "error");
        } finally {
            setSettingsSaving(false);
        }
    };

    const confirmResetSeed = async () => {
        if (resetting) return;
        setResetting(true);
        try {
            const res = await resetDemoSeed();
            setResetConfirmOpen(false);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            const summary = res.summary && typeof res.summary === "object"
                ? Object.entries(res.summary)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")
                : "";
            showToast(
                summary ? `Demo seed reset (${summary})` : "Demo seed reset completed",
                "success"
            );
            await loadSettings({ soft: true });
        } catch (e) {
            setResetConfirmOpen(false);
            showToast(toErrorText(e?.message || e, "Failed to reset demo seed"), "error");
        } finally {
            setResetting(false);
        }
    };

    const headerSubtitle =
        tab === "supervisors"
            ? "Supervisors & Zones"
            : tab === "settings"
                ? "System Settings"
                : "Users, Supervisors & System";

    const filteredUsers = useMemo(() => {
        const q = userQuery.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (item) =>
                String(item.name || "").toLowerCase().includes(q) ||
                String(item.email || "").toLowerCase().includes(q) ||
                String(item.roleLabel || "").toLowerCase().includes(q)
        );
    }, [users, userQuery]);

    const filteredSupervisors = useMemo(() => {
        const q = supQuery.trim().toLowerCase();
        return supervisors.filter(
            (item) =>
                !q ||
                item.name.toLowerCase().includes(q) ||
                item.zone.toLowerCase().includes(q) ||
                item.segment.toLowerCase().includes(q)
        );
    }, [supervisors, supQuery]);

    const activeCount = users.filter((item) => item.active !== false && item.status === "Active").length;

    const createUser = async (data) => {
        if (userSaving) return;
        setUserSaving(true);
        try {
            const res = await apiCreateUser({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
                supervisorId: data.supervisorId,
                phone: data.phone,
            });
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setUserForm(false);
            showToast("User created", "success");
            await loadUsers({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to create user"), "error");
        } finally {
            setUserSaving(false);
        }
    };

    const saveUserEdits = async (data) => {
        if (userSaving || !data?.id) return;
        setUserSaving(true);
        try {
            const payload = {
                name: data.name,
                phone: data.phone,
                supervisorId: data.supervisorId,
                active: data.active,
            };
            if (data.password) payload.password = data.password;
            const res = await apiUpdateUser(data.id, payload);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setEditUser(null);
            showToast("User updated", "success");
            await loadUsers({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to update user"), "error");
        } finally {
            setUserSaving(false);
        }
    };

    const toggleUserActive = async (item) => {
        if (!item?.id || userSaving) return;
        setUserSaving(true);
        try {
            const res = await apiUpdateUser(item.id, { active: !item.active });
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            showToast(
                !item.active ? "User activated" : "User deactivated",
                "success"
            );
            await loadUsers({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to update account status"), "error");
        } finally {
            setUserSaving(false);
        }
    };

    const saveSupervisor = async (data) => {
        if (supSaving) return;
        setSupSaving(true);
        try {
            const payload = {
                name: data.name,
                mobile: data.mobile,
                zoneCode: data.code,
                assignedRoadSegment: data.segment,
                color: data.color,
                notes: data.notes,
            };
            const res = data.id
                ? await apiUpdateSupervisor(data.id, payload)
                : await apiCreateSupervisor(payload);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setSupForm(false);
            setEditingSupervisor(null);
            showToast(data.id ? "Supervisor updated" : "Supervisor created", "success");
            await loadSupervisors({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save supervisor"), "error");
        } finally {
            setSupSaving(false);
        }
    };

    const confirmDeleteSupervisor = async () => {
        if (!deleteSupervisorId) return;
        const id = deleteSupervisorId;
        try {
            const res = await apiDeleteSupervisor(id);
            setDeleteSupervisorId(null);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setSupervisors((prev) => prev.filter((item) => String(item.id) !== String(id)));
            showToast("Supervisor deleted", "success");
        } catch (e) {
            setDeleteSupervisorId(null);
            showToast(toErrorText(e?.message || e, "Failed to delete supervisor"), "error");
        }
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title={headerSubtitle}
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <ScrollView
                style={styles.page}
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    tab === "settings" ? (
                        <RefreshControl
                            refreshing={settingsRefreshing}
                            onRefresh={() => loadSettings({ soft: true })}
                        />
                    ) : tab === "supervisors" ? (
                        <RefreshControl
                            refreshing={supRefreshing}
                            onRefresh={() => loadSupervisors({ soft: true })}
                        />
                    ) : tab === "users" ? (
                        <RefreshControl
                            refreshing={usersRefreshing}
                            onRefresh={() =>
                                loadUsers({ soft: true, q: userQuery.trim() || undefined })
                            }
                        />
                    ) : undefined
                }
            >
                {tab === "users" && (
                    <Text allowFontScaling={false} style={styles.caption}>
                        Role-based access control, zone assignments and demo data management
                    </Text>
                )}

                <View style={styles.tabs}>
                    <TabButton
                        icon={PROFILE}
                        label="Users"
                        active={tab === "users"}
                        onPress={() => setTab("users")}
                    />
                    <TabButton
                        icon={SUPERVISOR}
                        label="Supervisors & Zones"
                        active={tab === "supervisors"}
                        onPress={() => setTab("supervisors")}
                    />
                    <TabButton
                        icon={REPORTS}
                        label="System Settings"
                        active={tab === "settings"}
                        onPress={() => setTab("settings")}
                    />
                </View>

                {tab === "users" && (
                    <View>
                        <View style={styles.toolRow}>
                            <View style={styles.searchBox}>
                                <Image source={PROFILE} style={styles.searchIcon} resizeMode="contain" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.searchInput}
                                    value={userQuery}
                                    onChangeText={setUserQuery}
                                    placeholder="Search users by name or email..."
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View>
                                <TouchableOpacity
                                    style={styles.roleBtn}
                                    activeOpacity={0.85}
                                    onPress={() => setRoleOpen((v) => !v)}
                                >
                                    <Text allowFontScaling={false} style={styles.roleTxt}>{roleFilter}</Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                </TouchableOpacity>
                                {roleOpen && (
                                    <View style={styles.roleMenu}>
                                        {["All roles", ...ROLES].map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setRoleFilter(item);
                                                    setRoleOpen(false);
                                                }}
                                            >
                                                <Text allowFontScaling={false} style={styles.menuTxt}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.statBar}>
                            <View style={styles.statItem}>
                                <Image source={PROFILE} style={styles.statIcon} resizeMode="contain" />
                                <View>
                                    <Text allowFontScaling={false} style={styles.statValue}>{users.length}</Text>
                                    <Text allowFontScaling={false} style={styles.statLabel}>Total users</Text>
                                </View>
                            </View>
                            <View style={styles.statItem}>
                                <View style={[styles.dot, { backgroundColor: GREEN }]} />
                                <View>
                                    <Text allowFontScaling={false} style={styles.statValue}>{activeCount}</Text>
                                    <Text allowFontScaling={false} style={styles.statLabel}>Active</Text>
                                </View>
                            </View>
                            <View style={styles.statItem}>
                                <View style={[styles.dot, { backgroundColor: RED }]} />
                                <View>
                                    <Text allowFontScaling={false} style={styles.statValue}>{users.length - activeCount}</Text>
                                    <Text allowFontScaling={false} style={styles.statLabel}>Inactive</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.newBtn}
                                activeOpacity={0.85}
                                onPress={() => setUserForm(true)}
                            >
                                <Text allowFontScaling={false} style={styles.newBtnTxt}>+  New user</Text>
                            </TouchableOpacity>
                        </View>

                        {usersLoading && !filteredUsers.length ? (
                            <ActivityIndicator color={NAVY} style={{ marginTop: 28 }} />
                        ) : null}

                        {filteredUsers.map((item) => (
                            <View key={String(item.id)} style={styles.userCard}>
                                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                                    <Text allowFontScaling={false} style={styles.avatarTxt}>{item.initials}</Text>
                                </View>
                                <View style={styles.cardMain}>
                                    <View style={styles.cardTop}>
                                        <Text allowFontScaling={false} style={styles.cardName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <View style={styles.rolePill}>
                                            <Text allowFontScaling={false} style={styles.rolePillTxt}>
                                                {item.roleLabel || item.role}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.activePill,
                                                !item.active && styles.inactivePill,
                                            ]}
                                        >
                                            <Text
                                                allowFontScaling={false}
                                                style={[
                                                    styles.activeTxt,
                                                    !item.active && styles.inactiveTxt,
                                                ]}
                                            >
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text allowFontScaling={false} style={styles.email}>{item.email}</Text>
                                    <View style={styles.metaRow}>
                                        <Image source={ZONE} style={styles.metaIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.metaTxt} numberOfLines={1}>
                                            {item.zone || "—"}
                                        </Text>
                                        <Image source={FIELDATTENDANCE} style={styles.metaIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.metaTxt}>{item.date}</Text>
                                    </View>
                                    <View style={styles.userActions}>
                                        <TouchableOpacity
                                            style={styles.userActionBtn}
                                            activeOpacity={0.85}
                                            onPress={() => setEditUser(item)}
                                        >
                                            <Text allowFontScaling={false} style={styles.userEditTxt}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.userActionBtn}
                                            activeOpacity={0.85}
                                            onPress={() => toggleUserActive(item)}
                                        >
                                            <Text
                                                allowFontScaling={false}
                                                style={[
                                                    styles.userEditTxt,
                                                    { color: item.active ? ORANGE : GREEN },
                                                ]}
                                            >
                                                {item.active ? "Deactivate" : "Activate"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}

                        {!usersLoading && !filteredUsers.length ? (
                            <Text allowFontScaling={false} style={styles.emptySupTxt}>
                                No users found
                            </Text>
                        ) : null}
                    </View>
                )}

                {tab === "supervisors" && (
                    <View>
                        <View style={styles.banner}>
                            <View style={styles.bannerIconWrap}>
                                <Image source={LOCATION} style={styles.bannerIcon} resizeMode="contain" />
                            </View>
                            <View style={styles.bannerText}>
                                <Text allowFontScaling={false} style={styles.bannerTitle}>
                                    Supervisors & road segments
                                </Text>
                                <Text allowFontScaling={false} style={styles.bannerSub}>
                                    Each supervisor owns a zone; their mobile is shown on every vendor pin.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.newBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    setEditingSupervisor(null);
                                    setSupForm(true);
                                }}
                            >
                                <Text allowFontScaling={false} style={styles.newBtnTxt}>+  New{"\n"}supervisor</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBoxWide}>
                            <Image source={SUPERVISOR} style={styles.searchIcon} resizeMode="contain" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.searchInput}
                                value={supQuery}
                                onChangeText={setSupQuery}
                                placeholder="Search supervisor, zone or segment..."
                                placeholderTextColor={GREY}
                            />
                        </View>

                        {supLoading && !filteredSupervisors.length ? (
                            <ActivityIndicator color={NAVY} style={{ marginTop: 28 }} />
                        ) : null}

                        {filteredSupervisors.map((item) => (
                            <View key={String(item.id)} style={styles.supCard}>
                                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                                    <Text allowFontScaling={false} style={styles.avatarTxt}>
                                        {item.letter || item.zoneCode}
                                    </Text>
                                </View>
                                <View style={styles.cardMain}>
                                    <Text allowFontScaling={false} style={styles.cardName}>{item.name}</Text>
                                    <Text allowFontScaling={false} style={styles.zoneLine}>{item.zone}</Text>
                                    <Text allowFontScaling={false} style={styles.segment}>{item.segment}</Text>
                                </View>
                                <View style={styles.supMeta}>
                                    <View style={styles.supMetaRow}>
                                        <Image source={CITIZENCONTACT} style={styles.metaIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.metaTxt}>{item.phone || "—"}</Text>
                                    </View>
                                    <View style={styles.supMetaRow}>
                                        <Image source={VENDOR} style={styles.metaIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.metaTxt}>
                                            {item.vendors} vendors
                                        </Text>
                                    </View>
                                    <View style={styles.supActions}>
                                        <TouchableOpacity
                                            style={styles.supActionBtn}
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                setEditingSupervisor(item);
                                                setSupForm(true);
                                            }}
                                        >
                                            <Text allowFontScaling={false} style={styles.supEditTxt}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.supActionBtn}
                                            activeOpacity={0.85}
                                            onPress={() => setDeleteSupervisorId(item.id)}
                                        >
                                            <Image
                                                source={DELETE}
                                                style={styles.supDeleteIcon}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}

                        {!supLoading && !filteredSupervisors.length ? (
                            <Text allowFontScaling={false} style={styles.emptySupTxt}>
                                No supervisors found
                            </Text>
                        ) : null}
                    </View>
                )}

                {tab === "settings" && (
                    <View style={styles.settingsWrap}>
                        <View style={styles.settingsHead}>
                            <Image source={REPORTS} style={styles.settingsIcon} resizeMode="contain" />
                            <View style={{ flex: 1 }}>
                                <Text allowFontScaling={false} style={styles.settingsTitle}>
                                    System Settings
                                </Text>
                                <Text allowFontScaling={false} style={styles.settingsSub}>
                                    Application configuration loaded with your login token
                                </Text>
                            </View>
                        </View>

                        {settingsLoading && !settingsRefreshing ? (
                            <ActivityIndicator color={NAVY} style={{ marginVertical: 28 }} />
                        ) : (
                            <View style={styles.settingsForm}>
                                <FieldLabel icon={TITLE} text="APPLICATION NAME" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={settings.app_name}
                                    onChangeText={(v) => updateSetting("app_name", v)}
                                    placeholder="PKMD CRM"
                                    placeholderTextColor={GREY}
                                />

                                <FieldLabel icon={ZONE} text="ORGANIZATION" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={settings.organization}
                                    onChangeText={(v) => updateSetting("organization", v)}
                                    placeholder="Government of Odisha"
                                    placeholderTextColor={GREY}
                                />

                                <FieldLabel icon={CITIZENCONTACT} text="HELPLINE NUMBER" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={settings.helpline_number}
                                    onChangeText={(v) => updateSetting("helpline_number", v)}
                                    placeholder="18001234567"
                                    placeholderTextColor={GREY}
                                    keyboardType="phone-pad"
                                />

                                <FieldLabel icon={EMAIL} text="SUPPORT EMAIL" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={settings.support_email}
                                    onChangeText={(v) => updateSetting("support_email", v)}
                                    placeholder="support@example.com"
                                    placeholderTextColor={GREY}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <View style={styles.toggleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text allowFontScaling={false} style={styles.toggleTitle}>
                                            Maintenance Mode
                                        </Text>
                                        <Text allowFontScaling={false} style={styles.toggleSub}>
                                            Stored as "{settings.maintenance_mode}"
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settings.maintenance_mode === "true"}
                                        onValueChange={(v) =>
                                            updateSetting("maintenance_mode", v ? "true" : "false")
                                        }
                                        trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                                        thumbColor={
                                            settings.maintenance_mode === "true" ? BLUE : "#F8FAFC"
                                        }
                                    />
                                </View>

                                <View style={styles.toggleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text allowFontScaling={false} style={styles.toggleTitle}>
                                            Notifications Enabled
                                        </Text>
                                        <Text allowFontScaling={false} style={styles.toggleSub}>
                                            Stored as "{settings.notification_enabled}"
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settings.notification_enabled === "true"}
                                        onValueChange={(v) =>
                                            updateSetting(
                                                "notification_enabled",
                                                v ? "true" : "false"
                                            )
                                        }
                                        trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                                        thumbColor={
                                            settings.notification_enabled === "true"
                                                ? GREEN
                                                : "#F8FAFC"
                                        }
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveSettingsBtn, settingsSaving && { opacity: 0.7 }]}
                                    activeOpacity={0.85}
                                    onPress={saveSettings}
                                    disabled={settingsSaving}
                                >
                                    {settingsSaving ? (
                                        <ActivityIndicator color={WHITE} />
                                    ) : (
                                        <Text allowFontScaling={false} style={styles.saveSettingsTxt}>
                                            Save Settings
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.advancedCard}>
                                    <Text allowFontScaling={false} style={styles.advancedTitle}>
                                        Advanced
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.advancedSub}>
                                        Re-run demo seed data. This is destructive and may modify
                                        existing records.
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.resetBtn, resetting && { opacity: 0.7 }]}
                                        activeOpacity={0.85}
                                        onPress={() => setResetConfirmOpen(true)}
                                        disabled={resetting}
                                    >
                                        <Text allowFontScaling={false} style={styles.resetTxt}>
                                            Reset Demo Data
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <CreateUserModal
                visible={userForm}
                supervisors={supervisors}
                submitting={userSaving}
                onClose={() => setUserForm(false)}
                onSubmit={createUser}
            />
            <EditUserModal
                visible={!!editUser}
                user={editUser}
                supervisors={supervisors}
                submitting={userSaving}
                onClose={() => setEditUser(null)}
                onSubmit={saveUserEdits}
            />
            <AddSupervisorModal
                visible={supForm}
                initial={editingSupervisor}
                submitting={supSaving}
                onClose={() => {
                    setSupForm(false);
                    setEditingSupervisor(null);
                }}
                onSubmit={saveSupervisor}
            />

            <MyAlert
                visible={!!deleteSupervisorId}
                title="Delete Supervisor"
                message="Are you sure you want to delete this supervisor? Deletion fails if vendors are still linked to this zone."
                textRight="Delete"
                textLeft="Cancel"
                backgroundColor={RED}
                color={WHITE}
                onPressRight={confirmDeleteSupervisor}
                onPressLeft={() => setDeleteSupervisorId(null)}
                onRequestClose={() => setDeleteSupervisorId(null)}
            />

            <MyAlert
                visible={resetConfirmOpen}
                title="Reset Demo Data"
                message="Are you sure you want to re-run the demo seed? This operation may modify existing database records and affect application data."
                textRight={resetting ? "Resetting..." : "Confirm Reset"}
                textLeft="Cancel"
                backgroundColor={ORANGE}
                color={WHITE}
                onPressRight={confirmResetSeed}
                onPressLeft={() => {
                    if (!resetting) setResetConfirmOpen(false);
                }}
                onRequestClose={() => {
                    if (!resetting) setResetConfirmOpen(false);
                }}
            />

            {toastMessage.visible && (
                <ToastMessage
                    message={toastMessage.msg}
                    visible={toastMessage.visible}
                    setVisible={({ visible }) =>
                        setToastMessage((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={toastMessage.type === "success" ? GREEN : RED}
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={2500}
                    position="bottom"
                />
            )}
        </View>
    );
}

const TabButton = ({ icon, label, active, onPress }) => (
    <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.tab, active && styles.tabOn]}
    >
        <Image
            source={icon}
            style={[styles.tabIcon, active && styles.tabIconOn]}
            resizeMode="contain"
        />
        <Text allowFontScaling={false} style={[styles.tabTxt, active && styles.tabTxtOn]} numberOfLines={1}>
            {label}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F4F7FB" },
    page: { flex: 1 },
    pageContent: { paddingBottom: 28 },
    caption: {
        color: GREY,
        fontSize: 12,
        textAlign: "center",
        marginTop: 10,
        marginHorizontal: 20,
    },
    tabs: {
        flexDirection: "row",
        marginHorizontal: 14,
        marginTop: 12,
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: "#EEF2F7",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    tabOn: { backgroundColor: NAVY },
    tabIcon: { width: 14, height: 14, marginRight: 4, tintColor: NAVY },
    tabIconOn: { tintColor: WHITE },
    tabTxt: { color: NAVY, fontSize: 11, fontWeight: "700", flexShrink: 1 },
    tabTxtOn: { color: WHITE },
    toolRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginHorizontal: 14,
        marginTop: 12,
    },
    searchBox: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        marginRight: 8,
    },
    searchBoxWide: {
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        marginHorizontal: 14,
        marginBottom: 10,
    },
    searchIcon: { width: 14, height: 14, marginRight: 6, tintColor: GREY },
    searchInput: { flex: 1, color: NAVY, fontSize: 13, paddingVertical: 0 },
    roleBtn: {
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    roleTxt: { color: NAVY, fontSize: 12, fontWeight: "600" },
    roleMenu: {
        position: "absolute",
        top: 46,
        right: 0,
        minWidth: 160,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        zIndex: 20,
        elevation: 8,
    },
    statBar: {
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    statItem: { flexDirection: "row", alignItems: "center", marginRight: 10 },
    statIcon: { width: 18, height: 18, marginRight: 6, tintColor: "#64748B" },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statValue: { color: NAVY, fontSize: 14, fontWeight: "700" },
    statLabel: { color: GREY, fontSize: 10 },
    newBtn: {
        marginLeft: "auto",
        backgroundColor: ORANGE,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    newBtnTxt: { color: WHITE, fontSize: 12, fontWeight: "700", textAlign: "center" },
    userCard: {
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
        flexDirection: "row",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    avatarTxt: { color: WHITE, fontWeight: "700", fontSize: 13 },
    cardMain: { flex: 1 },
    cardTop: { flexDirection: "row", alignItems: "center" },
    cardName: { color: NAVY, fontSize: 14, fontWeight: "700", flexShrink: 1, marginRight: 6 },
    rolePill: {
        backgroundColor: "#EEF2FF",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 4,
    },
    rolePillTxt: { color: "#3730A3", fontSize: 10, fontWeight: "700" },
    activePill: {
        backgroundColor: "#E8F8EE",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    activeTxt: { color: GREEN, fontSize: 10, fontWeight: "700" },
    more: { marginLeft: 6, color: GREY, fontSize: 12, letterSpacing: 1 },
    email: { color: GREY, fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    metaIcon: { width: 12, height: 12, marginRight: 4, tintColor: GREY },
    metaTxt: { color: "#64748B", fontSize: 11, marginRight: 8, flexShrink: 1 },
    banner: {
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 10,
        backgroundColor: "#F3F7FF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E6EEF8",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    bannerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E7F0FF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    bannerIcon: { width: 16, height: 16, tintColor: "#2563EB" },
    bannerText: { flex: 1, marginRight: 8 },
    bannerTitle: { color: NAVY, fontSize: 13, fontWeight: "700" },
    bannerSub: { color: GREY, fontSize: 11, marginTop: 2, lineHeight: 15 },
    supCard: {
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    zoneLine: { color: NAVY, fontSize: 12, fontWeight: "600", marginTop: 2 },
    segment: { color: GREY, fontSize: 11, marginTop: 2 },
    supMeta: { alignItems: "flex-end", marginRight: 2 },
    supMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    supActions: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
    supActionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "#F1F5F9",
    },
    supEditTxt: { color: BLUE, fontSize: 11, fontWeight: "700" },
    supDeleteIcon: { width: 14, height: 14, tintColor: RED },
    emptySupTxt: { color: GREY, textAlign: "center", marginTop: 28, fontSize: 13 },
    userActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    userActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#F1F5F9",
    },
    userEditTxt: { color: BLUE, fontSize: 11, fontWeight: "700" },
    inactivePill: { backgroundColor: "#FEE2E2" },
    inactiveTxt: { color: RED },
    chevron: { color: GREY, fontSize: 16, marginLeft: 4 },
    settingsWrap: {
        marginHorizontal: 14,
        marginTop: 16,
        marginBottom: 8,
    },
    settingsHead: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 14,
        marginBottom: 12,
    },
    settingsIcon: { width: 28, height: 28, marginRight: 12, tintColor: NAVY },
    settingsTitle: { color: NAVY, fontSize: 16, fontWeight: "700" },
    settingsSub: { color: GREY, fontSize: 12, marginTop: 4, lineHeight: 16 },
    settingsForm: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 14,
        gap: 4,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    toggleTitle: { color: NAVY, fontSize: 14, fontWeight: "700" },
    toggleSub: { color: GREY, fontSize: 11, marginTop: 2 },
    saveSettingsBtn: {
        marginTop: 18,
        height: 46,
        borderRadius: 12,
        backgroundColor: NAVY,
        alignItems: "center",
        justifyContent: "center",
    },
    saveSettingsTxt: { color: WHITE, fontSize: 14, fontWeight: "700" },
    advancedCard: {
        marginTop: 18,
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#FFF7ED",
        borderWidth: 1,
        borderColor: "#FED7AA",
    },
    advancedTitle: { color: "#9A3412", fontSize: 14, fontWeight: "800" },
    advancedSub: { color: "#C2410C", fontSize: 12, marginTop: 4, lineHeight: 17 },
    resetBtn: {
        marginTop: 12,
        height: 42,
        borderRadius: 10,
        backgroundColor: ORANGE,
        alignItems: "center",
        justifyContent: "center",
    },
    resetTxt: { color: WHITE, fontSize: 13, fontWeight: "700" },
    modalRoot: {
        width: SCREEN.width,
        height: SCREEN.height,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        paddingHorizontal: 16,
    },
    formCard: {
        width: "100%",
        maxHeight: SCREEN.height * 0.82,
        backgroundColor: WHITE,
        borderRadius: 18,
        overflow: "hidden",
    },
    formHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
    },
    formTitle: { color: NAVY, fontSize: 18, fontWeight: "700" },
    formClose: { color: GREY, fontSize: 26, lineHeight: 28 },
    formScroll: { flexGrow: 0, flexShrink: 1 },
    formBody: { paddingHorizontal: 16, paddingBottom: 8 },
    fieldLabelRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 6 },
    fieldIcon: { width: 14, height: 14, marginRight: 6 },
    fieldLabel: { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
    twoCol: { flexDirection: "row", marginHorizontal: -6 },
    col: { flex: 1, paddingHorizontal: 6 },
    input: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        color: NAVY,
        fontSize: 14,
        backgroundColor: WHITE,
    },
    passwordRow: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
    },
    passwordInput: { flex: 1, color: NAVY, fontSize: 14, paddingVertical: 8 },
    eyeIcon: { width: 18, height: 18 },
    dropField: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
    },
    dropValue: { flex: 1, color: NAVY, fontSize: 14 },
    placeholder: { color: GREY },
    menu: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        overflow: "hidden",
    },
    menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
    menuIcon: { width: 14, height: 14, marginRight: 8 },
    menuTxt: { color: NAVY, fontSize: 13, flexShrink: 1 },
    colorRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
    colorDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        marginRight: 8,
        marginBottom: 8,
    },
    colorDotOn: {
        borderWidth: 2,
        borderColor: NAVY,
    },
    formFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        backgroundColor: "#F8FAFC",
    },
    cancelBtn: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
    },
    cancelTxt: { color: NAVY, fontSize: 13, fontWeight: "600" },
    saveBtn: {
        borderRadius: 10,
        backgroundColor: NAVY,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    saveTxt: { color: WHITE, fontSize: 13, fontWeight: "700" },
});
