import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../../services/api';
import { format, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function WeightTrackingScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weightData, setWeightData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const fetchWeightHistory = async (period = selectedPeriod) => {
    try {
      setError(null);
      const { data } = await api.getWeightHistory(period);
      setWeightData(data.entries);
      setStats(data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load weight history');
      console.error('Weight history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeightHistory();
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeightHistory();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setLoading(true);
  };

  const prepareChartData = () => {
    if (!weightData || weightData.length === 0) {
      return null;
    }

    // Sort entries by date
    const sortedEntries = [...weightData].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Limit to show readable labels based on data size
    const maxLabels = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 8 : 12;
    const step = Math.max(1, Math.floor(sortedEntries.length / maxLabels));

    const labels = sortedEntries
      .filter((_, index) => index % step === 0 || index === sortedEntries.length - 1)
      .map(entry => {
        const date = parseISO(entry.date);
        if (selectedPeriod === 'week') {
          return format(date, 'EEE');
        } else if (selectedPeriod === 'month') {
          return format(date, 'MMM dd');
        } else {
          return format(date, 'MMM');
        }
      });

    const weights = sortedEntries.map(entry => entry.weight);

    return {
      labels,
      datasets: [{
        data: weights,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading weight history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={() => fetchWeightHistory()} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const chartData = prepareChartData();
  const hasData = weightData && weightData.length > 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <Chip
          selected={selectedPeriod === 'week'}
          onPress={() => handlePeriodChange('week')}
          style={styles.chip}
        >
          Week
        </Chip>
        <Chip
          selected={selectedPeriod === 'month'}
          onPress={() => handlePeriodChange('month')}
          style={styles.chip}
        >
          Month
        </Chip>
        <Chip
          selected={selectedPeriod === 'year'}
          onPress={() => handlePeriodChange('year')}
          style={styles.chip}
        >
          Year
        </Chip>
        <Chip
          selected={selectedPeriod === 'all'}
          onPress={() => handlePeriodChange('all')}
          style={styles.chip}
        >
          All Time
        </Chip>
      </View>

      {!hasData ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noDataText}>No weight data available for this period</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('DailyEntry')}
              style={styles.logButton}
              icon="calendar-today"
            >
              Log Weight Entry
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.statValue}>{stats?.current?.toFixed(1) || '-'}</Text>
                <Text style={styles.statUnit}>lbs</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.statLabel}>Change</Text>
                <Text style={[styles.statValue, stats?.change < 0 ? styles.positive : stats?.change > 0 ? styles.negative : null]}>
                  {stats?.change ? (stats.change > 0 ? '+' : '') + stats.change.toFixed(1) : '-'}
                </Text>
                <Text style={styles.statUnit}>lbs</Text>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.statLabel}>Min</Text>
                <Text style={styles.statValue}>{stats?.min?.toFixed(1) || '-'}</Text>
                <Text style={styles.statUnit}>lbs</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.statLabel}>Max</Text>
                <Text style={styles.statValue}>{stats?.max?.toFixed(1) || '-'}</Text>
                <Text style={styles.statUnit}>lbs</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>{stats?.avg?.toFixed(1) || '-'}</Text>
                <Text style={styles.statUnit}>lbs</Text>
              </Card.Content>
            </Card>
          </View>

          {/* Weight Chart */}
          {chartData && (
            <Card style={styles.card}>
              <Card.Content>
                <Title>Weight Trend</Title>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={chartData}
                    width={Math.max(screenWidth - 48, chartData.labels.length * 60)}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#2196F3'
                      }
                    }}
                    bezier
                    style={styles.chart}
                  />
                </ScrollView>
              </Card.Content>
            </Card>
          )}

          {/* Recent Entries */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Recent Entries</Title>
              {weightData.slice(-10).reverse().map((entry, index) => (
                <View key={entry.id || index}>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryDate}>
                      {format(parseISO(entry.date), 'MMM dd, yyyy')}
                    </Text>
                    <Text style={styles.entryWeight}>{entry.weight.toFixed(1)} lbs</Text>
                  </View>
                  {index < Math.min(10, weightData.length) - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </Card.Content>
          </Card>
        </>
      )}

      {/* Log Weight Button */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('DailyEntry')}
            style={styles.logButton}
            icon="calendar-today"
          >
            Log New Weight Entry
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    marginTop: 8
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  chip: {
    marginHorizontal: 4
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12
  },
  statCard: {
    flex: 1
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  statUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  positive: {
    color: '#4caf50'
  },
  negative: {
    color: '#f44336'
  },
  card: {
    margin: 12,
    marginBottom: 6
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 24
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  entryDate: {
    fontSize: 14,
    color: '#666'
  },
  entryWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2'
  },
  divider: {
    marginVertical: 4
  },
  logButton: {
    marginTop: 8
  },
  spacer: {
    height: 24
  }
});
