import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';

const TrendGraph = ({ title, trendData }) => {
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        minHeight: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography variant="body1" color="textSecondary">
          No trend data available
        </Typography>
      </Box>
    );
  }

  // Format dates for better display
  const formattedData = trendData.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short',
      year: 'numeric'
    }),
    volume: point.volume
  }));

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      minHeight: '350px',
      position: 'relative',
      px: 2,
      pb: 4
    }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
        {title || 'Search Interest Over Time'}
      </Typography>
      <ResponsiveContainer>
        <LineChart
          data={formattedData}
          margin={{
            top: 20,
            right: 25,
            left: 25,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickMargin={15}
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}`}
            width={55}
            tickMargin={10}
          />
          <Tooltip 
            formatter={(value) => [`${value}`, 'Search Interest']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '8px'
            }}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#2196f3"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#2196f3', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TrendGraph;
