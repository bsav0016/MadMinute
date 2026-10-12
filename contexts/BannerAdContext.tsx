import React, {
    ReactNode,
    useEffect,
    useState,
    useRef,
    createContext,
    useContext,
} from "react";
import { Platform } from "react-native";
import { BannerAd, BannerAdSize, TestIds, useForeground } from "react-native-google-mobile-ads";
import {
    getTrackingPermissionsAsync,
    requestTrackingPermissionsAsync,
    PermissionStatus,
} from "expo-tracking-transparency";

interface BannerAdContextProps {
    permissionStatus: PermissionStatus | null;
    loadAd: () => void;
}

const BannerAdContext = createContext<BannerAdContextProps | undefined>(undefined);

const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : "ca-app-pub-3407478259803394/2433217529";

export const BannerAdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
    const bannerRef = useRef<BannerAd>(null);

    useEffect(() => {
        const checkTrackingPermissions = async () => {
            const { status } = await getTrackingPermissionsAsync();
            if (status === PermissionStatus.UNDETERMINED) {
                const { status: newStatus } = await requestTrackingPermissionsAsync();
                setPermissionStatus(newStatus);
            } else {
                setPermissionStatus(status);
            }
        };

        checkTrackingPermissions();
    }, []);

    useForeground(() => {
        if (Platform.OS === "ios") {
            bannerRef.current?.load();
        }
    });

    const loadAd = () => {
        bannerRef.current?.load();
    };

    return (
        <BannerAdContext.Provider value={{ permissionStatus, loadAd }}>
            {children}
            <BannerAd
                ref={bannerRef}
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            />
        </BannerAdContext.Provider>
    );
};

export const useBannerAd = () => {
    const context = useContext(BannerAdContext);
    if (!context) {
        throw new Error("useBannerAd must be used within a BannerAdProvider");
    }
    return context;
};
