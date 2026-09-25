import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { getLogo, logoUrl, searchLogos } from 'banklogos';
// React Native: import from banklogos/native/<id> (PNG/WebP image sources for <Image>).
import gtbank from 'banklogos/native/gtbank'; // SVG logo -> PNG rendering
import accessBank from 'banklogos/native/access-bank'; // WebP logo
import kudaMark from 'banklogos/native/kuda-mark'; // WebP mark
// The web-oriented img/<id> path also works for WebP logos in React Native (it passes the asset id through).
import kudaImg from 'banklogos/img/kuda-mark';

export default function App() {
  const [query, setQuery] = useState('');
  const gtb = getLogo({ bankCode: '058' });
  const results = query ? searchLogos(query, { limit: 8 }) : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your bank</Text>
      <Text testID="lookup">058 → {gtb?.name}</Text>
      <View style={styles.row}>
        <Image testID="native-svg-png" source={gtbank} style={styles.logo} resizeMode="contain" />
        <Image testID="native-webp" source={accessBank} style={styles.logo} resizeMode="contain" />
        <Image testID="native-mark" source={kudaMark} style={styles.logo} resizeMode="contain" />
        <Image testID="img-path" source={kudaImg as never} style={styles.logo} resizeMode="contain" />
        <Image
          testID="cdn"
          source={{ uri: logoUrl(getLogo({ bankCode: '050' })!) }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <TextInput
        testID="search"
        placeholder="Search banks"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <Text>{item.shortName ?? item.name}</Text>}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 64, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 56, height: 56 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
});
