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
  // Early return for invalid data
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: '#ffffff',
        borderRadius: 1,
        p: 3
      }}>
        <Typography variant="h6" color="text.secondary">
          No trend data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try uploading a different photo or checking back later
        </Typography>
      </Box>
    );
  }

  // Transform the data to ensure it's in the correct format
  const formattedData = trendData.map((item, index) => ({
    name: typeof item === 'object' ? (item.date || item.month || `Month ${index + 1}`) : `Month ${index + 1}`,
    value: typeof item === 'object' ? (item.interest || item.volume || 0) : (typeof item === 'number' ? item : 0)
  }));

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: '#ffffff',
      borderRadius: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <ResponsiveContainer>
        <LineChart
          data={formattedData}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#666' }}
            tickMargin={10}
            stroke="#e0e0e0"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#666' }}
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}`}
            tickMargin={10}
            stroke="#e0e0e0"
          />
          <Tooltip 
            formatter={(value) => [value, 'Interest']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '8px'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
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
